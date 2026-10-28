import { SEVERITY_RANK, type AlertCandidate, type LevelDef, type RecipientSpec } from "@/domain/alerts";
import { BusinessCalendar, ITALIAN_CALENDAR, isoDate, type IsoDate } from "@/domain/dates";
import { evaluateProcedure, type ProcedureEvaluation } from "@/domain/evaluate";
import { DEFAULT_SETTINGS, type EngineSettings, type ProcedureAggregate } from "@/domain/model";
import { fastestCandidate, serializeSimulation, simulate } from "@/domain/reschedule";
import type { Clock } from "@/infrastructure/clock";
import { tx, type Db } from "@/infrastructure/db/connection";
import { listProcedureIds, loadAggregatesBulk } from "@/infrastructure/repo/procedures";
import { formatDateIt, formatEuro } from "@/contracts/format";

/** Calendario con le festività aggiuntive configurate (US-101). */
export async function calendarFromDb(db: Db): Promise<BusinessCalendar> {
  const r = (await db.prepare("SELECT value_json FROM config WHERE key = 'calendar.extra_holidays'").get()) as { value_json: string } | undefined;
  const extra = r ? (JSON.parse(r.value_json) as string[]).map((d) => isoDate(d)) : [];
  return new BusinessCalendar({ ...ITALIAN_CALENDAR, extraHolidays: extra });
}

export async function engineSettings(db: Db): Promise<EngineSettings> {
  const r = (await db.prepare("SELECT value_json FROM config WHERE key = 'engine.settings'").get()) as { value_json: string } | undefined;
  return r ? { ...DEFAULT_SETTINGS, ...(JSON.parse(r.value_json) as Partial<EngineSettings>) } : DEFAULT_SETTINGS;
}

interface Recipient {
  key: string;
  userId: number | null;
  email: string;
}

interface UserRow {
  id: number;
  login: string;
  email: string;
  role: string;
  structure_scope: string;
}

const ROLE_OF: Record<string, string> = {
  STRUCTURE: "STRUCTURE_USER",
  PROCUREMENT: "PROCUREMENT_OFFICER",
  FINANCE: "FINANCE_OFFICER",
  EXECUTIVE: "EXECUTIVE",
};

function resolveRecipientsFromUsers(users: UserRow[], specs: RecipientSpec[], owner: string, structureCode: string): Recipient[] {
  const out = new Map<string, Recipient>();
  for (const spec of specs) {
    const logical = spec === "OWNER" ? owner : spec;
    const role = ROLE_OF[logical];
    if (!role) continue;
    const matched = users.filter((u) => u.role === role && (u.structure_scope === "*" || u.structure_scope === structureCode)).sort((a, b) => a.id - b.id);
    if (matched.length) for (const u of matched) out.set(`user:${u.login}`, { key: `user:${u.login}`, userId: u.id, email: u.email });
    else {
      const box = logical === "STRUCTURE" ? `struttura.${structureCode.toLowerCase().replace(/_/g, "-")}@demo.invalid` : `${role.toLowerCase()}@demo.invalid`;
      out.set(`mailbox:${box}`, { key: `mailbox:${box}`, userId: null, email: box });
    }
  }
  return [...out.values()];
}

/** Risoluzione ROLE@SCOPE → utenti o casella funzionale (DEC-062). Interroga il DB a ogni chiamata:
 *  tenuta per compatibilità/uso puntuale; il ciclo di runChecks usa la variante precaricata sopra (DEC-115). */
export async function resolveRecipients(db: Db, specs: RecipientSpec[], owner: string, structureCode: string): Promise<Recipient[]> {
  const out = new Map<string, Recipient>();
  for (const spec of specs) {
    const logical = spec === "OWNER" ? owner : spec;
    const role = ROLE_OF[logical];
    if (!role) continue;
    const users = (await db
      .prepare("SELECT id, login, email FROM users WHERE role = ? AND active = 1 AND (structure_scope = '*' OR structure_scope = ?) ORDER BY id")
      .all(role, structureCode)) as { id: number; login: string; email: string }[];
    if (users.length) for (const u of users) out.set(`user:${u.login}`, { key: `user:${u.login}`, userId: u.id, email: u.email });
    else {
      const box = logical === "STRUCTURE" ? `struttura.${structureCode.toLowerCase().replace(/_/g, "-")}@demo.invalid` : `${role.toLowerCase()}@demo.invalid`;
      out.set(`mailbox:${box}`, { key: `mailbox:${box}`, userId: null, email: box });
    }
  }
  return [...out.values()];
}

function emailFor(a: AlertCandidate, proc: { code: string; title: string; programmed: string }, ev: ProcedureEvaluation, baseUrl: string) {
  const url = `${baseUrl}/procedure/${proc.code}`;
  if (a.rule === "MILESTONE_DEADLINE" && a.target === "MEMORY_SUBMISSION" && a.level.level.startsWith("T-")) {
    return {
      subject: `[INAPP DEMO] Memoria in scadenza ${a.level.level === "T-5" ? "tra 5 giorni" : `(${a.level.level})`} — ${proc.code}`,
      body: `La memoria della procedura "${proc.title}" deve essere presentata entro il ${formatDateIt(a.dueDate)}.\nIn assenza della memoria entro il termine, la procedura potrebbe richiedere una riprogrammazione con effetti sul cronoprogramma e sulla previsione di spesa.\nImporto programmato: ${formatEuro(proc.programmed)}\nApri la procedura: ${url}`,
    };
  }
  if (a.rule === "RESCHEDULE_REQUIRED") {
    return {
      subject: `[INAPP DEMO] Riprogrammazione richiesta — ${proc.code}`,
      body: `La milestone "${ev.milestones.find((m) => m.code === a.target)?.def.label ?? a.target}" è scaduta il ${formatDateIt(a.dueDate)} senza completamento registrato.\nIl sistema ha predisposto una simulazione (alternativa più rapida). La proposta non modifica i dati correnti finché non viene approvata da un soggetto autorizzato.\nApri la procedura: ${url}`,
    };
  }
  return {
    subject: `[INAPP DEMO] ${a.level.severity === "CRITICAL" ? "CRITICO" : "Avviso"} ${a.level.level} — ${proc.code} — ${a.title}`,
    body: `Procedura "${proc.title}" (${proc.code}).\n${a.title}: scadenza ${formatDateIt(a.dueDate)}.\nApri la procedura: ${url}`,
  };
}

function levelRank(level: string): number {
  const order = ["T-1M", "T-10", "T-5", "T-2", "T0", "T+1", "FLAG"];
  return order.indexOf(level);
}

export interface RunChecksResult {
  referenceDate: IsoDate;
  procedures: number;
  alertsOpened: number;
  notifications: number;
  emails: number;
  simulationsCreated: number;
}

interface AlertRow {
  id: number;
  procedure_id: number;
  kind: "ALERT" | "ANOMALY";
  rule: string;
  target: string;
  due_key: string;
  status: string;
  current_level: string | null;
  severity: string;
  suspended_until: string | null;
}

function groupByProc<T extends { procedure_id: number }>(rows: T[]): Map<number, T[]> {
  const m = new Map<number, T[]>();
  for (const r of rows) {
    const arr = m.get(r.procedure_id);
    if (arr) arr.push(r);
    else m.set(r.procedure_id, [r]);
  }
  return m;
}

function buildMultiRowInsert(table: string, columns: string[], rows: unknown[][], suffix = ""): { sql: string; values: unknown[] } {
  const placeholders = rows.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
  return { sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}${suffix}`, values: rows.flat() };
}

async function batchInsert(db: Db, table: string, columns: string[], rows: unknown[][]): Promise<number> {
  if (!rows.length) return 0;
  const { sql, values } = buildMultiRowInsert(table, columns, rows);
  const r = await db.prepare(sql).run(...values);
  return r.changes;
}

async function batchInsertReturningIds(db: Db, table: string, columns: string[], rows: unknown[][]): Promise<number[]> {
  if (!rows.length) return [];
  const { sql, values } = buildMultiRowInsert(table, columns, rows, " RETURNING id");
  const result = (await db.prepare(sql).all(...values)) as { id: number }[];
  return result.map((r) => r.id);
}

/** Procedure per blocco (DEC-115): round trip di rete ridotti da ~una dozzina per procedura a una
 *  dozzina per blocco intero. L'atomicità passa da "per procedura" a "per blocco" (stesso
 *  compromesso già fatto in seed-loader.ts). */
const CHUNK_SIZE = 200;

export async function runChecks(db: Db, clock: Clock, opts: { procedureIds?: number[]; baseUrl?: string } = {}): Promise<RunChecksResult> {
  const ref = clock.referenceDate();
  const settings = await engineSettings(db);
  const cal = await calendarFromDb(db);
  const baseUrl = opts.baseUrl ?? process.env.APP_BASE_URL ?? "http://localhost:3000";
  const ids = opts.procedureIds ?? (await listProcedureIds(db));
  const res: RunChecksResult = { referenceDate: ref, procedures: 0, alertsOpened: 0, notifications: 0, emails: 0, simulationsCreated: 0 };
  if (!ids.length) return res;
  const aggregates = await loadAggregatesBulk(db, ids); // DEC-115: 11 query totali invece di ~12 per procedura
  const allUsers = (await db.prepare("SELECT id, login, email, role, structure_scope FROM users WHERE active = 1").all()) as unknown as UserRow[];

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    await runChecksChunk(db, ids.slice(i, i + CHUNK_SIZE), aggregates, allUsers, ref, settings, cal, baseUrl, clock, res);
  }
  return res;
}

async function runChecksChunk(
  db: Db,
  chunk: number[],
  aggregates: Map<number, ProcedureAggregate>,
  allUsers: UserRow[],
  ref: IsoDate,
  settings: EngineSettings,
  cal: BusinessCalendar,
  baseUrl: string,
  clock: Clock,
  res: RunChecksResult,
): Promise<void> {
  const now = clock.nowIso();

  // --- Precaricamento (DEC-115): una manciata di query per l'intero blocco invece che per procedura.
  const procMetaRows = (await db.prepare("SELECT id, cig, current_version_id FROM procedures WHERE id = ANY(?)").all(chunk)) as {
    id: number;
    cig: string | null;
    current_version_id: number;
  }[];
  const procMeta = new Map(procMetaRows.map((r) => [r.id, r]));

  const allAlertRows = (await db.prepare("SELECT * FROM alerts WHERE procedure_id = ANY(?)").all(chunk)) as unknown as AlertRow[];
  const alertsByProc = groupByProc(allAlertRows);

  const existingAlertIds = allAlertRows.map((a) => a.id);
  const allNotifRows = existingAlertIds.length
    ? ((await db.prepare("SELECT alert_id, level, recipient, channel FROM alert_notifications WHERE alert_id = ANY(?)").all(existingAlertIds)) as {
        alert_id: number;
        level: string;
        recipient: string;
        channel: string;
      }[])
    : [];
  const notifKeysByAlert = new Map<number, Set<string>>();
  for (const n of allNotifRows) {
    if (!notifKeysByAlert.has(n.alert_id)) notifKeysByAlert.set(n.alert_id, new Set());
    notifKeysByAlert.get(n.alert_id)!.add(`${n.level}|${n.recipient}|${n.channel}`);
  }

  const autoSimRows = (await db
    .prepare("SELECT procedure_id, base_version_id FROM simulations WHERE procedure_id = ANY(?) AND created_by = 'system' AND status IN ('DRAFT','SUBMITTED')")
    .all(chunk)) as { procedure_id: number; base_version_id: number }[];
  const autoSimByProc = new Map<number, Set<number>>();
  for (const r of autoSimRows) {
    if (!autoSimByProc.has(r.procedure_id)) autoSimByProc.set(r.procedure_id, new Set());
    autoSimByProc.get(r.procedure_id)!.add(r.base_version_id);
  }
  const simCountRows = (await db.prepare("SELECT procedure_id, COUNT(*) AS n FROM simulations WHERE procedure_id = ANY(?) GROUP BY procedure_id").all(chunk)) as {
    procedure_id: number;
    n: number;
  }[];
  const simCountByProc = new Map(simCountRows.map((r) => [r.procedure_id, r.n]));

  // --- Fase 1 (pura, in memoria): stessa logica di decisione di prima, ma accumula le scritture
  // invece di eseguirle subito. Gli id delle alert nuove non esistono ancora: si usano id
  // temporanei negativi, risolti dopo la INSERT in blocco (fase 2).
  let tempSeq = -1;
  const newAlertRows: {
    tempId: number;
    pid: number;
    kind: "ALERT" | "ANOMALY";
    rule: string;
    target: string;
    due_key: string;
    due_date: string | null;
    current_level: string | null;
    severity: string;
    owner: string | null;
    title: string;
    message: string | null;
  }[] = [];
  const alertUpdates = new Map<number, { current_level: string | null; severity: string; status: string }>();
  const notifyNeeded: { alertRef: number; pid: number; structureCode: string; proc: { code: string; title: string; programmed: string }; ev: ProcedureEvaluation; a: AlertCandidate; level: LevelDef }[] = [];
  const simRows: unknown[][] = [];
  const snapshotRows: unknown[][] = [];
  const snapshotYearRows: unknown[][] = [];
  const searchRows: unknown[][] = [];
  const searchCodes: string[] = [];

  for (const pid of chunk) {
    const agg = aggregates.get(pid)!;
    const ev = evaluateProcedure(agg, ref, settings);
    const meta = procMeta.get(pid)!;
    const myAlerts = (alertsByProc.get(pid) ?? []).map((a) => ({ ...a }));
    res.procedures++;

    const procInfo = { code: agg.code, title: agg.title, programmed: agg.programmed.toString() };

    const keep = new Set<number>();
    for (const a of ev.alerts) {
      const dueKey = a.dueDate ?? "";
      const existing = myAlerts.find((r) => r.kind === "ALERT" && r.rule === a.rule && r.target === a.target && r.due_key === dueKey);
      let idRef: number;
      if (!existing) {
        const tempId = tempSeq--;
        newAlertRows.push({ tempId, pid, kind: "ALERT", rule: a.rule, target: a.target, due_key: dueKey, due_date: a.dueDate, current_level: a.level.level, severity: a.level.severity, owner: a.owner, title: a.title, message: null });
        myAlerts.push({ id: tempId, procedure_id: pid, kind: "ALERT", rule: a.rule, target: a.target, due_key: dueKey, status: "OPEN", current_level: a.level.level, severity: a.level.severity, suspended_until: null });
        idRef = tempId;
        res.alertsOpened++;
      } else {
        idRef = existing.id;
        const higher = levelRank(a.level.level) > levelRank(existing.current_level ?? "");
        if (higher || existing.status === "AUTO_CLOSED") {
          const newStatus = existing.status === "AUTO_CLOSED" || existing.status === "RESOLVED" ? "OPEN" : existing.status;
          existing.current_level = a.level.level;
          existing.severity = a.level.severity;
          existing.status = newStatus;
          alertUpdates.set(existing.id, { current_level: a.level.level, severity: a.level.severity, status: newStatus });
        }
      }
      keep.add(idRef);
      const row = myAlerts.find((r) => r.id === idRef)!;
      const suspended = row.status === "SUSPENDED" && row.suspended_until !== null && row.suspended_until > ref;
      if (!suspended && row.status !== "RESOLVED") notifyNeeded.push({ alertRef: idRef, pid, structureCode: agg.structureCode, proc: procInfo, ev, a, level: a.level });
    }
    for (const o of myAlerts.filter((r) => r.kind === "ALERT" && ["OPEN", "ACKNOWLEDGED", "SUSPENDED"].includes(r.status)))
      if (!keep.has(o.id)) {
        o.status = "AUTO_CLOSED";
        if (o.id > 0) {
          const prev = alertUpdates.get(o.id);
          alertUpdates.set(o.id, { current_level: prev?.current_level ?? o.current_level, severity: prev?.severity ?? o.severity, status: "AUTO_CLOSED" });
        }
      }

    // --- Anomalie (coda unica, tipo distinto)
    const keepA = new Set<number>();
    for (const an of ev.anomalies) {
      const ex = myAlerts.find((r) => r.kind === "ANOMALY" && r.rule === an.rule && r.target === an.target && r.due_key === "");
      if (!ex) {
        const tempId = tempSeq--;
        newAlertRows.push({ tempId, pid, kind: "ANOMALY", rule: an.rule, target: an.target, due_key: "", due_date: null, current_level: null, severity: an.severity, owner: "PROCUREMENT", title: an.message, message: an.message });
        myAlerts.push({ id: tempId, procedure_id: pid, kind: "ANOMALY", rule: an.rule, target: an.target, due_key: "", status: "OPEN", current_level: null, severity: an.severity, suspended_until: null });
        keepA.add(tempId);
      } else {
        keepA.add(ex.id);
        if (ex.status === "AUTO_CLOSED") {
          ex.status = "OPEN";
          alertUpdates.set(ex.id, { current_level: ex.current_level, severity: ex.severity, status: "OPEN" });
        }
      }
    }
    for (const o of myAlerts.filter((r) => r.kind === "ANOMALY" && ["OPEN", "ACKNOWLEDGED", "SUSPENDED"].includes(r.status)))
      if (!keepA.has(o.id)) {
        o.status = "AUTO_CLOSED";
        if (o.id > 0) {
          const prev = alertUpdates.get(o.id);
          alertUpdates.set(o.id, { current_level: prev?.current_level ?? o.current_level, severity: prev?.severity ?? o.severity, status: "AUTO_CLOSED" });
        }
      }

    // --- Simulazione automatica (DEC-041)
    if (ev.rescheduleRequired) {
      const src = ev.deadlines.find((d) => d.kind === "MILESTONE" && d.blocking && d.daysUntil <= -1);
      const versionId = meta.current_version_id;
      const exists = (autoSimByProc.get(pid) ?? new Set()).has(versionId);
      if (src && !exists) {
        const cand = fastestCandidate(agg, src.target, ref, cal);
        const sim = simulate(agg, src.target, cand, ref, cal);
        const n = (simCountByProc.get(pid) ?? 0) + 1;
        simCountByProc.set(pid, n);
        simRows.push([
          `RS-${agg.code.replace("-", "")}-${String(n).padStart(3, "0")}`,
          pid,
          versionId,
          src.target,
          sim.candidateDate,
          src.target === "MEMORY_SUBMISSION" ? "MEMORY_OVERDUE" : "MILESTONE_OVERDUE",
          "Bozza generata automaticamente al T+1 (DEC-041): da verificare e inviare in approvazione",
          JSON.stringify(serializeSimulation(sim)),
          sim.criticalities.some((c) => c.severity === "BLOCKING") ? 1 : 0,
          "system",
          now,
        ]);
        res.simulationsCreated++;
      }
    }

    // --- Proiezione per le liste (NFR-002): conteggi dallo stato in memoria appena aggiornato
    const openFinal = myAlerts.filter((r) => ["OPEN", "ACKNOWLEDGED", "SUSPENDED"].includes(r.status));
    const counts = {
      alerts: openFinal.filter((r) => r.kind === "ALERT").length,
      crit: openFinal.filter((r) => r.kind === "ALERT" && r.severity === "CRITICAL").length,
      anomalies: openFinal.filter((r) => r.kind === "ANOMALY").length,
    };
    const active = ev.milestones.find((m) => m.active);
    snapshotRows.push([
      pid, ev.status, ev.health, JSON.stringify(ev.healthDrivers), ev.nextDeadline?.due ?? null, ev.nextDeadline?.target ?? null, ev.nextDeadline?.label ?? null,
      ev.nextDeadline?.daysUntil ?? null, ev.rescheduleRequired ? 1 : 0, ev.late ? 1 : 0, ev.programmed.cents, ev.contracted?.cents ?? null, ev.paid.cents,
      ev.liquidated.cents, ev.residual.cents, ev.atRisk.total.cents, ev.atRisk.uncovered.cents, ev.atRisk.slipping.cents, counts.alerts, counts.crit, counts.anomalies,
      active?.def.owner ?? (ev.status === "EXECUTION" || ev.status === "CLOSING" ? "STRUCTURE" : null), ref, now,
    ]);
    for (const y of new Set([...ev.annualNeed.keys(), ...ev.available.keys()]))
      snapshotYearRows.push([pid, y, ev.annualNeed.get(y)?.cents ?? 0n, ev.available.get(y)?.cents ?? 0n]);
    searchCodes.push(agg.code);
    searchRows.push([agg.code, agg.title, agg.structureCode, meta.cig ?? ""]);
  }

  // --- Fase 2 (scritture in blocco, un'unica transazione per il blocco, DEC-115)
  await tx(db, async (db) => {
    const tempToReal = new Map<number, number>();
    if (newAlertRows.length) {
      const rows = newAlertRows.map((r) => [r.pid, r.kind, r.rule, r.target, r.due_key, r.due_date, r.current_level, r.severity, "OPEN", r.owner, r.title, r.message, now, now]);
      const realIds = await batchInsertReturningIds(
        db,
        "alerts",
        ["procedure_id", "kind", "rule", "target", "due_key", "due_date", "current_level", "severity", "status", "owner", "title", "message", "created_at", "updated_at"],
        rows,
      );
      newAlertRows.forEach((r, i) => tempToReal.set(r.tempId, realIds[i]!));
    }

    if (alertUpdates.size) {
      const rows = [...alertUpdates.entries()].map(([id, u]) => [id, u.current_level, u.severity, u.status]);
      const placeholders = rows.map(() => "(?::integer, ?, ?, ?)").join(", ");
      await db
        .prepare(
          `UPDATE alerts AS a SET current_level = v.current_level, severity = v.severity, status = v.status, updated_at = ? FROM (VALUES ${placeholders}) AS v(id, current_level, severity, status) WHERE a.id = v.id`,
        )
        .run(now, ...rows.flat());
    }

    // --- Notifiche: risolve gli id temporanei, poi batch per canale
    const inAppRows: unknown[][] = [];
    const outboxRows: unknown[][] = [];
    const emailPending: { alertId: number; level: string; recipient: string; userId: number | null }[] = [];
    const localNotifKeys = new Map<number, Set<string>>();
    for (const n of notifyNeeded) {
      const alertId = n.alertRef < 0 ? tempToReal.get(n.alertRef)! : n.alertRef;
      const keys = localNotifKeys.get(alertId) ?? new Set(notifKeysByAlert.get(alertId) ?? []);
      localNotifKeys.set(alertId, keys);
      const recipients = resolveRecipientsFromUsers(allUsers, n.level.recipients, n.a.owner, n.structureCode);
      const mail = emailFor(n.a, n.proc, n.ev, baseUrl);
      for (const r of recipients) {
        if (n.level.channels.includes("IN_APP") && r.userId !== null) {
          const key = `${n.level.level}|${r.key}|IN_APP`;
          if (!keys.has(key)) {
            inAppRows.push([alertId, n.level.level, r.key, r.userId, now]);
            keys.add(key);
          }
        }
        if (n.level.channels.includes("EMAIL")) {
          const key = `${n.level.level}|${r.key}|EMAIL`;
          if (!keys.has(key)) {
            const messageId = `<alert-${alertId}-${n.level.level}-${r.key.replace(/[^a-z0-9.@-]/gi, "_")}@inapp-demo.invalid>`;
            outboxRows.push([r.email, mail.subject, mail.body, messageId, now, now]);
            emailPending.push({ alertId, level: n.level.level, recipient: r.key, userId: r.userId });
            keys.add(key);
            res.emails++;
          }
        }
      }
    }
    if (inAppRows.length) {
      const { sql, values } = buildMultiRowInsert(
        "alert_notifications",
        ["alert_id", "level", "recipient", "user_id", "channel", "created_at"],
        inAppRows.map((r) => [...r.slice(0, 4), "IN_APP", r[4]]),
        " ON CONFLICT (alert_id, level, recipient, channel) DO NOTHING",
      );
      const r = await db.prepare(sql).run(...values);
      res.notifications += r.changes;
    }
    if (outboxRows.length) {
      const outboxIds = await batchInsertReturningIds(db, "outbox", ["recipient", "subject", "body", "message_id", "created_at", "next_attempt_at"], outboxRows);
      const emailNotifRows = emailPending.map((e, i) => [e.alertId, e.level, e.recipient, e.userId, "EMAIL", outboxIds[i]!, now]);
      const { sql, values } = buildMultiRowInsert(
        "alert_notifications",
        ["alert_id", "level", "recipient", "user_id", "channel", "outbox_id", "created_at"],
        emailNotifRows,
        " ON CONFLICT (alert_id, level, recipient, channel) DO NOTHING",
      );
      await db.prepare(sql).run(...values);
    }

    await batchInsert(
      db,
      "simulations",
      ["code", "procedure_id", "base_version_id", "source_milestone", "candidate_date", "kind", "cause", "notes", "status", "result_json", "blocking", "created_by", "created_at"],
      simRows.map((r) => [r[0], r[1], r[2], r[3], r[4], "FASTEST", r[5], r[6], "DRAFT", r[7], r[8], r[9], r[10]]),
    );

    if (snapshotRows.length) {
      const placeholders = snapshotRows
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .join(", ");
      await db
        .prepare(
          `INSERT INTO procedure_snapshot (procedure_id, status, health, health_drivers_json, next_deadline_date, next_deadline_target, next_deadline_label, days_until,
           reschedule_required, late, programmed_cents, contracted_cents, paid_cents, liquidated_cents, residual_cents, at_risk_cents, uncovered_cents, slipping_cents,
           open_alerts, critical_alerts, open_anomalies, owner, reference_date, updated_at)
         VALUES ${placeholders}
         ON CONFLICT(procedure_id) DO UPDATE SET status=excluded.status, health=excluded.health, health_drivers_json=excluded.health_drivers_json,
           next_deadline_date=excluded.next_deadline_date, next_deadline_target=excluded.next_deadline_target, next_deadline_label=excluded.next_deadline_label,
           days_until=excluded.days_until, reschedule_required=excluded.reschedule_required, late=excluded.late, programmed_cents=excluded.programmed_cents,
           contracted_cents=excluded.contracted_cents, paid_cents=excluded.paid_cents, liquidated_cents=excluded.liquidated_cents, residual_cents=excluded.residual_cents,
           at_risk_cents=excluded.at_risk_cents, uncovered_cents=excluded.uncovered_cents, slipping_cents=excluded.slipping_cents, open_alerts=excluded.open_alerts,
           critical_alerts=excluded.critical_alerts, open_anomalies=excluded.open_anomalies, owner=excluded.owner, reference_date=excluded.reference_date, updated_at=excluded.updated_at`,
        )
        .run(...snapshotRows.flat());
    }

    await db.prepare("DELETE FROM procedure_snapshot_year WHERE procedure_id = ANY(?)").run(chunk);
    await batchInsert(db, "procedure_snapshot_year", ["procedure_id", "year", "need_cents", "available_cents"], snapshotYearRows);

    if (searchCodes.length) await db.prepare("DELETE FROM procedure_search WHERE code = ANY(?)").run(searchCodes);
    await batchInsert(db, "procedure_search", ["code", "title", "structure", "cig"], searchRows);
  });
}

export { SEVERITY_RANK };
