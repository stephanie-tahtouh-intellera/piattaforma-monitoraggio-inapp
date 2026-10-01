import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { projectRoot } from "../config/templates";

const nowIso = () => new Date(Date.now()).toISOString();

export type Db = Database.Database;

declare global {
  // eslint-disable-next-line no-var -- singleton condiviso tra i moduli Next in sviluppo
  var __inappDb: Db | undefined;
}

export function databasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(projectRoot(), ".data", "inapp.db");
}

/** Apre una connessione con i pragma di DEC-096. */
export function openDb(file: string = databasePath()): Db {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = FULL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("temp_store = MEMORY");
  return db;
}

/** Connessione di processo (web o worker). */
export function getDb(): Db {
  if (!globalThis.__inappDb) {
    const db = openDb();
    migrate(db);
    globalThis.__inappDb = db;
  }
  return globalThis.__inappDb;
}

export function setDbForTests(db: Db | undefined): void {
  globalThis.__inappDb = db;
}

/** Applica le migrazioni numerate e poi i trigger idempotenti (CR-39). */
export function migrate(db: Db): void {
  const root = projectRoot();
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const dir = path.join(root, "db", "migrations");
  const applied = new Set((db.prepare("SELECT name FROM schema_migrations").all() as { name: string }[]).map((r) => r.name));
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    if (applied.has(f)) continue;
    const sql = readFileSync(path.join(dir, f), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(f, nowIso());
    })();
  }
  db.exec(readFileSync(path.join(root, "db", "sql", "triggers.sql"), "utf8"));
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

export function missingTriggers(db: Db): string[] {
  const present = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all() as { name: string }[]).map((r) => r.name));
  return REQUIRED_TRIGGERS.filter((t) => !present.has(t));
}

/** Transazione IMMEDIATE (singolo scrittore, DEC-096). Nessun I/O esterno dentro fn. */
export function tx<T>(db: Db, fn: () => T): T {
  return db.transaction(fn).immediate();
}
