import { Pool, type PoolClient, types } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { projectRoot } from "../config/templates";

// bigint (OID 20) e numeric (OID 1700, usato dai SUM() su colonne *_cents) -> number: gli importi in
// centesimi di questa demo restano ben dentro Number.MAX_SAFE_INTEGER (DEC-115, sostituisce il bigint
// nativo di libSQL/SQLite; il dominio converte comunque sempre con Money.ofCents(BigInt(...))).
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

const nowIso = () => new Date(Date.now()).toISOString();

export interface PreparedLike {
  get(...params: unknown[]): Promise<Record<string, unknown> | undefined>;
  all(...params: unknown[]): Promise<Record<string, unknown>[]>;
  run(...params: unknown[]): Promise<{ changes: number; lastInsertRowid: number }>;
}

/** Interfaccia Db: stesso shape sincrono di prepare(), metodi get/all/run asincroni (DEC-112, portata su Postgres in DEC-115). */
export interface Db {
  prepare(sql: string): PreparedLike;
  exec(sql: string): Promise<void>;
  readonly protocol: string;
}

interface Executor {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
}

declare global {
  // eslint-disable-next-line no-var -- singleton condiviso tra i moduli Next in sviluppo
  var __inappDb: Db | undefined;
  // eslint-disable-next-line no-var
  var __inappPool: Pool | undefined;
}

/** Tabelle senza colonna `id` (PK su altre colonne): niente RETURNING id sulle INSERT (DEC-115). */
const NO_ID_TABLES = new Set([
  "schema_migrations", "system_meta", "config", "structures", "suppliers", "sessions", "milestone_forecasts", "milestones",
  "document_pages", "notification_reads", "leader_lease", "worker_heartbeat", "idempotency_keys",
  "procedure_snapshot", "procedure_snapshot_year", "procedure_search",
]);

function insertTargetTable(sql: string): string | null {
  const m = /^\s*insert\s+into\s+"?(\w+)"?/i.exec(sql);
  return m ? m[1]!.toLowerCase() : null;
}

function needsReturningId(sql: string): boolean {
  if (!/^\s*insert\b/i.test(sql) || /\breturning\b/i.test(sql)) return false;
  const table = insertTargetTable(sql);
  return table !== null && !NO_ID_TABLES.has(table);
}

/**
 * Traduce i placeholder SQLite/libSQL (posizionali `?`, o nominali `@nome` con un singolo oggetto
 * come parametro) in placeholder posizionali Postgres (`$1, $2, ...`), ignorando i `?`/`@` dentro
 * stringhe letterali (DEC-115). Non tocca i call site esistenti in `src/`.
 */
function toPgSql(sql: string, params: unknown[]): { text: string; values: unknown[] } {
  const named = params.length === 1 && params[0] !== null && typeof params[0] === "object" && !Array.isArray(params[0]);
  const obj = named ? (params[0] as Record<string, unknown>) : undefined;
  const values: unknown[] = [];
  let out = "";
  let inString = false;
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i]!;
    if (ch === "'") {
      inString = !inString;
      out += ch;
      i++;
      continue;
    }
    if (!inString && !named && ch === "?") {
      values.push(params[values.length]);
      out += `$${values.length}`;
      i++;
      continue;
    }
    if (!inString && named && ch === "@") {
      const m = /^@(\w+)/.exec(sql.slice(i));
      if (m) {
        values.push(obj![m[1]!]);
        out += `$${values.length}`;
        i += m[0].length;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return { text: out, values };
}

function wrapExecutor(executor: Executor): Db {
  return {
    protocol: "postgres",
    prepare(sql: string): PreparedLike {
      return {
        async get(...params: unknown[]) {
          const { text, values } = toPgSql(sql, params);
          const res = await executor.query(text, values);
          return res.rows[0];
        },
        async all(...params: unknown[]) {
          const { text, values } = toPgSql(sql, params);
          const res = await executor.query(text, values);
          return res.rows;
        },
        async run(...params: unknown[]) {
          const { text, values } = toPgSql(sql, params);
          const returning = needsReturningId(text);
          const res = await executor.query(returning ? `${text} RETURNING id` : text, values);
          return {
            changes: res.rowCount ?? 0,
            lastInsertRowid: returning ? Number((res.rows[0] as { id?: number } | undefined)?.id ?? 0) : 0,
          };
        },
      };
    },
    async exec(sql: string) {
      // Protocollo "simple query" (nessun array di values): ammette più statement separati da ';'.
      await executor.query(sql);
    },
  };
}

/** URL di connessione Postgres (Vercel Postgres/Neon, DEC-115): un solo database per dev, test e produzione. */
export function databaseUrl(): string {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL non impostata (vedi .env.example, DEC-115)");
  return url;
}

/** Apre un pool di connessioni Postgres. */
export async function openDb(url: string = databaseUrl()): Promise<Db> {
  const pool = new Pool({ connectionString: url });
  globalThis.__inappPool = pool;
  return wrapExecutor(pool);
}

/** Connessione di processo (web o worker). */
export async function getDb(): Promise<Db> {
  if (!globalThis.__inappDb) {
    const db = await openDb();
    await migrate(db);
    globalThis.__inappDb = db;
  }
  return globalThis.__inappDb;
}

export function setDbForTests(db: Db | undefined): void {
  globalThis.__inappDb = db;
}

/**
 * Lock applicativo per le migrazioni (DEC-116): su Vercel più cold start concorrenti possono chiamare
 * migrate() in parallelo sullo stesso database, e i DDL concorrenti (CREATE TABLE/TRIGGER/INDEX)
 * falliscono con "tuple concurrently updated". Un pg_advisory_lock di sessione serializza i tentativi:
 * chi arriva dopo attende, poi trova tutto già applicato e non fa nulla.
 */
const MIGRATION_LOCK_KEY = 487_215_063;

/** Applica le migrazioni numerate e poi i trigger idempotenti (CR-39). */
export async function migrate(db: Db): Promise<void> {
  const pool = globalThis.__inappPool;
  if (!pool) throw new Error("migrate(): nessun pool Postgres attivo per questa connessione");
  const lockClient: PoolClient = await pool.connect();
  try {
    await lockClient.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    const root = projectRoot();
    await db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
    const applied = new Set(
      ((await db.prepare("SELECT name FROM schema_migrations").all()) as { name: string }[]).map((r) => r.name),
    );
    const dir = path.join(root, "db", "migrations");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
      if (applied.has(f)) continue;
      const sql = readFileSync(path.join(dir, f), "utf8");
      await tx(db, async (tdb) => {
        await tdb.exec(sql);
        await tdb.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(f, nowIso());
      });
    }
    await db.exec(readFileSync(path.join(root, "db", "sql", "triggers.sql"), "utf8"));
  } finally {
    await lockClient.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    lockClient.release();
  }
}

export const REQUIRED_TRIGGERS = [
  "trg_audit_no_update",
  "trg_audit_no_delete",
  "trg_mov_no_update",
  "trg_mov_no_delete",
  "trg_version_no_update",
  "trg_version_no_delete",
  "trg_mf_no_update",
  "trg_fl_no_update",
  "trg_notif_no_update",
];

export async function missingTriggers(db: Db): Promise<string[]> {
  const present = new Set(
    ((await db.prepare("SELECT tgname AS name FROM pg_trigger WHERE NOT tgisinternal").all()) as { name: string }[]).map(
      (r) => r.name,
    ),
  );
  return REQUIRED_TRIGGERS.filter((t) => !present.has(t));
}

/**
 * Transazione interattiva (DEC-096, portata su Postgres in DEC-115): fn riceve un Db scoped alla
 * transazione — usarlo al posto del db esterno per ogni query dentro fn. Nessun I/O esterno dentro fn.
 */
export async function tx<T>(db: Db, fn: (tdb: Db) => Promise<T> | T): Promise<T> {
  const pool = globalThis.__inappPool;
  if (!pool) throw new Error("tx(): nessun pool Postgres attivo per questa connessione");
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    const tdb = wrapExecutor(client);
    const result = await fn(tdb);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
