import { SEVERITY_RANK, type AlertCandidate, type LevelDef, type RecipientSpec } from "@/domain/alerts";
import { BusinessCalendar, ITALIAN_CALENDAR, isoDate, type IsoDate } from "@/domain/dates";
import { evaluateProcedure, type ProcedureEvaluation } from "@/domain/evaluate";
import { DEFAULT_SETTINGS, type EngineSettings } from "@/domain/model";
import { fastestCandidate, serializeSimulation, simulate } from "@/domain/reschedule";
import type { Clock } from "@/infrastructure/clock";
import { tx, type Db } from "@/infrastructure/db/connection";
import { listProcedureIds, loadAggregate } from "@/infrastructure/repo/procedures";
import { formatDateIt, formatEuro } from "@/contracts/format";

/** Calendario con le festività aggiuntive configurate (US-101). */
export function calendarFromDb(db: Db): BusinessCalendar {
  const r = db.prepare("SELECT value_json FROM config WHERE key = 'calendar.extra_holidays'").get() as { value_json: string } | undefined;
  const extra = r ? (JSON.parse(r.value_json) as string[]).map((d) => isoDate(d)) : [];
  return new BusinessCalendar({ ...ITALIAN_CALENDAR, extraHolidays: extra });
}

export function engineSettings(db: Db): EngineSettings {
  const r = db.prepare("SELECT value_json FROM config WHERE key = 'engine.settings'").get() as { value_json: string } | undefined;
  return r ? { ...DEFAULT_SETTINGS, ...(JSON.parse(r.value_json) as Partial<EngineSettings>) } : DEFAULT_SETTINGS;
}

interface Recipient {
  key: string;
  userId: number | null;
  email: string;
}

const ROLE_OF: Record<string, string> = {
  STRUCTURE: "STRUCTURE_USER",
  PROCUREMENT: "PROCUREMENT_OFFICER",
  FINANCE: "FINANCE_OFFICER",
  EXECUTIVE: "EXECUTIVE",
};

/** Risoluzione ROLE@SCOPE → utenti o casella funzionale (DEC-062). */
export function resolveRecipients(db: Db, specs: RecipientSpec[], owner: string, structureCode: string): Recipient[] {
  const out = new Map<string, Recipient>();
  for (const spec of specs) {
    const logical = spec === "OWNER" ? owner : spec;
    const role = ROLE_OF[logical];
    if (!role) continue;
    const users = db
      .prepare("SELECT id, login, email FROM users WHERE role = ? AND active = 1 AND (structure_scope = '*' OR structure_scope = ?) ORDER BY id")
      .all(role, structureCode) as { id: number; login: string; email: string }[];
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

export function runChecks(db: Db, clock: Clock, opts: { procedureIds?: number[]; baseUrl?: string } = {}): RunChecksResult {
  const ref = clock.referenceDate();
  const settings = engineSettings(db);
  const cal = calendarFromDb(db);
  const baseUrl = opts.baseUrl ?? process.env.APP_BASE_URL ?? "http://localhost:3000";
  const ids = opts.procedureIds ?? listProcedureIds(db);
  const res: RunChecksResult = { referenceDate: ref, procedures: 0, alertsOpened: 0, notifications: 0, emails: 0, simulationsCreated: 0 };

  for (const pid of ids) {
    const agg = loadAggregate(db, pid);
    const ev = evaluateProcedure(agg, ref, settings);
    const now = clock.nowIso();
    tx(db, () => {
      res.procedures++;
      // --- Alert
      const keep = new Set<number>();
      for (const a of ev.alerts) {
        const dueKey = a.dueDate ?? "";
        const existing = db
          .prepare("SELECT id, status, current_level FROM alerts WHERE procedure_id = ? AND kind = 'ALERT' AND rule = ? AND target = ? AND due_key = ?")
          .get(pid, a.rule, a.target, dueKey) as { id: number; status: string; current_level: string } | undefined;
        let alertId: number;
        if (!existing) {
          const r = db
            .prepare(
              `INSERT INTO alerts (procedure_id, kind, rule, target, due_key, due_date, current_level, severity, status, owner, title, message, created_at, updated_at)
               VALUES (?, 'ALERT', ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?)`,
            )
            .run(pid, a.rule, a.target, dueKey, a.dueDate, a.level.level, a.level.severity, a.owner, a.title, null, now, now);
          alertId = Number(r.lastInsertRowid);
          res.alertsOpened++;
        } else {
          alertId = existing.id;
          const higher = levelRank(a.level.level) > levelRank(existing.current_level);
          if (higher || existing.status === "AUTO_CLOSED") {
            db.prepare("UPDATE alerts SET current_level = ?, severity = ?, status = CASE WHEN status IN ('AUTO_CLOSED','RESOLVED') THEN 'OPEN' ELSE status END, updated_at = ? WHERE id = ?").run(
              a.level.level,
              a.level.severity,
              now,
              alertId,
            );
          }
        }
        keep.add(alertId);
        const status = (db.prepare("SELECT status, suspended_until FROM alerts WHERE id = ?").get(alertId) as { status: string; suspended_until: string | null });
        const suspended = status.status === "SUSPENDED" && status.suspended_until !== null && status.suspended_until > ref;
        if (!suspended && status.status !== "RESOLVED") notify(db, alertId, a, a.level, agg.structureCode, { code: agg.code, title: agg.title, programmed: agg.programmed.toString() }, ev, baseUrl, now, res);
      }
      const open = db.prepare("SELECT id FROM alerts WHERE procedure_id = ? AND kind = 'ALERT' AND status IN ('OPEN','ACKNOWLEDGED','SUSPENDED')").all(pid) as { id: number }[];
      for (const o of open) if (!keep.has(o.id)) db.prepare("UPDATE alerts SET status = 'AUTO_CLOSED', updated_at = ? WHERE id = ?").run(now, o.id);

      // --- Anomalie (coda unica, tipo distinto)
      const keepA = new Set<number>();
      for (const an of ev.anomalies) {
        const ex = db.prepare("SELECT id, status FROM alerts WHERE procedure_id = ? AND kind = 'ANOMALY' AND rule = ? AND target = ? AND due_key = ''").get(pid, an.rule, an.target) as
          | { id: number; status: string }
          | undefined;
        if (!ex) {
          const r = db
            .prepare(
              `INSERT INTO alerts (procedure_id, kind, rule, target, due_key, severity, status, owner, title, message, created_at, updated_at)
               VALUES (?, 'ANOMALY', ?, ?, '', ?, 'OPEN', 'VALIDATOR', ?, ?, ?, ?)`,
            )
            .run(pid, an.rule, an.target, an.severity, an.message, an.message, now, now);
          keepA.add(Number(r.lastInsertRowid));
        } else {
          keepA.add(ex.id);
          if (ex.status === "AUTO_CLOSED") db.prepare("UPDATE alerts SET status = 'OPEN', updated_at = ? WHERE id = ?").run(now, ex.id);
        }
      }
      const openA = db.prepare("SELECT id FROM alerts WHERE procedure_id = ? AND kind = 'ANOMALY' AND status IN ('OPEN','ACKNOWLEDGED','SUSPENDED')").all(pid) as { id: number }[];
      for (const o of openA) if (!keepA.has(o.id)) db.prepare("UPDATE alerts SET status = 'AUTO_CLOSED', updated_at = ? WHERE id = ?").run(now, o.id);

      // --- Simulazione automatica (DEC-041)
      if (ev.rescheduleRequired) {
        const src = ev.deadlines.find((d) => d.kind === "MILESTONE" && d.blocking && d.daysUntil <= -1);
        const versionId = (db.prepare("SELECT current_version_id AS v FROM procedures WHERE id = ?").get(pid) as { v: number }).v;
        const exists = db
          .prepare("SELECT id FROM simulations WHERE procedure_id = ? AND base_version_id = ? AND created_by = 'system' AND status IN ('DRAFT','SUBMITTED')")
          .get(pid, versionId);
        if (src && !exists) {
          const cand = fastestCandidate(agg, src.target, ref, cal);
          const sim = simulate(agg, src.target, cand, ref, cal);
          const n = (db.prepare("SELECT COUNT(*) AS n FROM simulations WHERE procedure_id = ?").get(pid) as { n: number }).n + 1;
          db.prepare(
            `INSERT INTO simulations (code, procedure_id, base_version_id, source_milestone, candidate_date, kind, cause, notes, status, result_json, blocking, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, 'FASTEST', ?, ?, 'DRAFT', ?, ?, 'system', ?)`,
          ).run(
            `RS-${agg.code.replace("-", "")}-${String(n).padStart(3, "0")}`,
            pid,
            versionId,
            src.target,
            sim.candidateDate,
            src.target === "MEMORY_SUBMISSION" ? "MEMORY_OVERDUE" : "MILESTONE_OVERDUE",
            "Bozza generata automaticamente al T+1 (DEC-041): da verificare e inviare in approvazione",
            JSON.stringify(serializeSimulation(sim)),
            sim.criticalities.some((c) => c.severity === "BLOCKING") ? 1 : 0,
            now,
          );
          res.simulationsCreated++;
        }
      }

      // --- Proiezione per le liste (NFR-002)
      const counts = db
        .prepare(
          `SELECT SUM(CASE WHEN kind='ALERT' THEN 1 ELSE 0 END) AS alerts, SUM(CASE WHEN kind='ALERT' AND severity='CRITICAL' THEN 1 ELSE 0 END) AS crit,
                  SUM(CASE WHEN kind='ANOMALY' THEN 1 ELSE 0 END) AS anomalies
           FROM alerts WHERE procedure_id = ? AND status IN ('OPEN','ACKNOWLEDGED','SUSPENDED')`,
        )
        .get(pid) as { alerts: number | null; crit: number | null; anomalies: number | null };
      const active = ev.milestones.find((m) => m.active);
      db.prepare(
        `INSERT INTO procedure_snapshot (procedure_id, status, health, health_drivers_json, next_deadline_date, next_deadline_target, next_deadline_label, days_until,
           reschedule_required, late, programmed_cents, contracted_cents, paid_cents, liquidated_cents, residual_cents, at_risk_cents, uncovered_cents, slipping_cents,
           open_alerts, critical_alerts, open_anomalies, owner, reference_date, updated_at)
         VALUES (@pid, @status, @health, @drivers, @nd, @nt, @nl, @du, @rr, @late, @prog, @contr, @paid, @liq, @res, @risk, @unc, @slip, @oa, @ca, @an, @owner, @ref, @now)
         ON CONFLICT(procedure_id) DO UPDATE SET status=excluded.status, health=excluded.health, health_drivers_json=excluded.health_drivers_json,
           next_deadline_date=excluded.next_deadline_date, next_deadline_target=excluded.next_deadline_target, next_deadline_label=excluded.next_deadline_label,
           days_until=excluded.days_until, reschedule_required=excluded.reschedule_required, late=excluded.late, programmed_cents=excluded.programmed_cents,
           contracted_cents=excluded.contracted_cents, paid_cents=excluded.paid_cents, liquidated_cents=excluded.liquidated_cents, residual_cents=excluded.residual_cents,
           at_risk_cents=excluded.at_risk_cents, uncovered_cents=excluded.uncovered_cents, slipping_cents=excluded.slipping_cents, open_alerts=excluded.open_alerts,
           critical_alerts=excluded.critical_alerts, open_anomalies=excluded.open_anomalies, owner=excluded.owner, reference_date=excluded.reference_date, updated_at=excluded.updated_at`,
      ).run({
        pid,
        status: ev.status,
        health: ev.health,
        drivers: JSON.stringify(ev.healthDrivers),
        nd: ev.nextDeadline?.due ?? null,
        nt: ev.nextDeadline?.target ?? null,
        nl: ev.nextDeadline?.label ?? null,
        du: ev.nextDeadline?.daysUntil ?? null,
        rr: ev.rescheduleRequired ? 1 : 0,
        late: ev.late ? 1 : 0,
        prog: ev.programmed.cents,
        contr: ev.contracted?.cents ?? null,
        paid: ev.paid.cents,
        liq: ev.liquidated.cents,
        res: ev.residual.cents,
        risk: ev.atRisk.total.cents,
        unc: ev.atRisk.uncovered.cents,
        slip: ev.atRisk.slipping.cents,
        oa: counts.alerts ?? 0,
        ca: counts.crit ?? 0,
        an: counts.anomalies ?? 0,
        owner: active?.def.owner ?? (ev.status === "EXECUTION" || ev.status === "CLOSING" ? "STRUCTURE" : null),
        ref,
        now,
      });
      db.prepare("DELETE FROM procedure_snapshot_year WHERE procedure_id = ?").run(pid);
      const years = new Set([...ev.annualNeed.keys(), ...ev.available.keys()]);
      for (const y of years) {
        db.prepare("INSERT INTO procedure_snapshot_year (procedure_id, year, need_cents, available_cents) VALUES (?, ?, ?, ?)").run(
          pid,
          y,
          ev.annualNeed.get(y)?.cents ?? 0n,
          ev.available.get(y)?.cents ?? 0n,
        );
      }
      db.prepare("DELETE FROM procedure_search WHERE code = ?").run(agg.code);
      db.prepare("INSERT INTO procedure_search (code, title, structure, cig) VALUES (?, ?, ?, ?)").run(
        agg.code,
        agg.title,
        agg.structureCode,
        (db.prepare("SELECT cig FROM procedures WHERE id = ?").get(pid) as { cig: string | null }).cig ?? "",
      );
    });
  }
  return res;
}

function notify(
  db: Db,
  alertId: number,
  a: AlertCandidate,
  level: LevelDef,
  structureCode: string,
  proc: { code: string; title: string; programmed: string },
  ev: ProcedureEvaluation,
  baseUrl: string,
  now: string,
  res: RunChecksResult,
): void {
  const recipients = resolveRecipients(db, level.recipients, a.owner, structureCode);
  const mail = emailFor(a, proc, ev, baseUrl);
  for (const r of recipients) {
    if (level.channels.includes("IN_APP") && r.userId !== null) {
      const ins = db
        .prepare("INSERT OR IGNORE INTO alert_notifications (alert_id, level, recipient, user_id, channel, created_at) VALUES (?, ?, ?, ?, 'IN_APP', ?)")
        .run(alertId, level.level, r.key, r.userId, now);
      if (ins.changes) res.notifications++;
    }
    if (level.channels.includes("EMAIL")) {
      const exists = db.prepare("SELECT id FROM alert_notifications WHERE alert_id = ? AND level = ? AND recipient = ? AND channel = 'EMAIL'").get(alertId, level.level, r.key);
      if (exists) continue;
      const messageId = `<alert-${alertId}-${level.level}-${r.key.replace(/[^a-z0-9.@-]/gi, "_")}@inapp-demo.invalid>`;
      const ob = db
        .prepare("INSERT INTO outbox (channel, recipient, subject, body, message_id, created_at, next_attempt_at) VALUES ('EMAIL', ?, ?, ?, ?, ?, ?)")
        .run(r.email, mail.subject, mail.body, messageId, now, now);
      db.prepare("INSERT INTO alert_notifications (alert_id, level, recipient, user_id, channel, outbox_id, created_at) VALUES (?, ?, ?, ?, 'EMAIL', ?, ?)").run(
        alertId,
        level.level,
        r.key,
        r.userId,
        Number(ob.lastInsertRowid),
        now,
      );
      res.emails++;
    }
  }
}

export { SEVERITY_RANK };
