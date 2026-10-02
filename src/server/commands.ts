import { DomainError } from "@/application/errors";
import { cancelProcedureTx, closeProcedureTx } from "@/application/procedure-events";
import { calendarFromDb, engineSettings, runChecks } from "@/application/run-checks";
import { resetDemo, type DatasetName } from "@/application/bootstrap";
import { BusinessCalendar, addDays, isoDate, yearOf } from "@/domain/dates";
import { Money } from "@/domain/money";
import { serializeSimulation, simulate, type AlternativeKind } from "@/domain/reschedule";
import { writeAudit } from "@/infrastructure/audit";
import { configuredReferenceDate, dbClock, systemNowIso } from "@/infrastructure/clock";
import { tx, type Db } from "@/infrastructure/db/connection";
import { loadAggregate } from "@/infrastructure/repo/procedures";
import { createSession, type Actor } from "./auth";
import { can, require as requireAction, requireProcedure } from "./authz";

const audit = (db: Db, actor: Actor, e: Omit<Parameters<typeof writeAudit>[1], "actor" | "at" | "impersonatedBy">) =>
  writeAudit(db, { ...e, actor: actor.login, impersonatedBy: actor.impersonatedBy, at: systemNowIso() });

function recheck(db: Db, procedureId: number) {
  runChecks(db, dbClock(db), { procedureIds: [procedureId] });
}

const OWNER_ROLE: Record<string, string[]> = {
  STRUCTURE: ["STRUCTURE_USER"],
  PROCUREMENT: ["PROCUREMENT_OFFICER"],
  FINANCE: ["FINANCE_OFFICER"],
};

/** US-031: completamento di una milestone (owner o validatore), data effettiva intangibile dopo. */
export function completeMilestone(db: Db, actor: Actor, code: string, milestone: string, date: string, note: string | null) {
  requireAction(actor, "milestone.update");
  const p = requireProcedure(db, actor, code);
  const agg = loadAggregate(db, p.id);
  const def = agg.template.milestones.find((m) => m.code === milestone);
  if (!def) throw new DomainError("NOT_FOUND", "Milestone non trovata", 404);
  if (actor.role !== "VALIDATOR" && !OWNER_ROLE[def.owner]?.includes(actor.role)) {
    throw new DomainError("FORBIDDEN", "Solo l'owner della milestone o il validatore possono completarla", 403);
  }
  const ref = configuredReferenceDate(db);
  const d = isoDate(date);
  if (d > ref) throw new DomainError("VALIDATION_ERROR", "La data effettiva non può essere successiva alla data di riferimento", 422);
  const idx = agg.template.milestones.findIndex((m) => m.code === milestone);
  const prev = agg.template.milestones.slice(0, idx).some((m) => {
    const inst = agg.milestones.find((x) => x.code === m.code);
    return !inst?.actualDate && inst?.manualState !== "NOT_APPLICABLE";
  });
  if (prev) throw new DomainError("INVALID_TRANSITION", "Completa prima le milestone precedenti", 409);
  const row = db.prepare("SELECT actual_date FROM milestones WHERE procedure_id = ? AND code = ?").get(p.id, milestone) as { actual_date: string | null };
  if (row.actual_date) throw new DomainError("INVALID_TRANSITION", "Milestone già completata: la data effettiva non si modifica (BR-006)", 409);
  tx(db, () => {
    db.prepare("UPDATE milestones SET actual_date = ?, completed_by = ?, completed_at = ?, note = ?, version = version + 1 WHERE procedure_id = ? AND code = ?").run(
      d,
      actor.login,
      systemNowIso(),
      note,
      p.id,
      milestone,
    );
    db.prepare("INSERT INTO evidences (procedure_id, field, value, source_type, locator, excerpt, method, confidence, author, created_at) VALUES (?, ?, ?, 'MANUAL', NULL, ?, 'MANUAL', '1.00', ?, ?)").run(
      p.id,
      `milestone.${milestone}.actual`,
      d,
      note,
      actor.login,
      systemNowIso(),
    );
    audit(db, actor, { action: "MILESTONE_COMPLETE", entityType: "MILESTONE", entityId: `${code}:${milestone}`, procedureCode: code, before: { actual: null }, after: { actual: d }, reason: note });
  });
  recheck(db, p.id);
}

/** US-051/052/053: simulazione salvata come DRAFT; nessun dato corrente cambia. */
export function createSimulation(
  db: Db,
  actor: Actor,
  code: string,
  input: { source: string; candidateDate: string; kind: AlternativeKind; cause: string; notes?: string | null },
) {
  requireAction(actor, "simulation.create");
  const p = requireProcedure(db, actor, code);
  const ref = configuredReferenceDate(db);
  const agg = loadAggregate(db, p.id);
  const r = simulate(agg, input.source, isoDate(input.candidateDate), ref, calendarFromDb(db));
  const ser = serializeSimulation(r);
  const versionId = (db.prepare("SELECT current_version_id AS v FROM procedures WHERE id = ?").get(p.id) as { v: number }).v;
  return tx(db, () => {
    const n = (db.prepare("SELECT COUNT(*) AS n FROM simulations WHERE procedure_id = ?").get(p.id) as { n: number }).n + 1;
    const simCode = `RS-${code.replace(/-/g, "")}-${String(n).padStart(3, "0")}`;
    db.prepare(
      `INSERT INTO simulations (code, procedure_id, base_version_id, source_milestone, candidate_date, kind, cause, notes, status, result_json, blocking, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?)`,
    ).run(simCode, p.id, versionId, input.source, r.candidateDate, input.kind, input.cause, input.notes ?? null, JSON.stringify(ser), r.criticalities.some((c) => c.severity === "BLOCKING") ? 1 : 0, actor.login, systemNowIso());
    audit(db, actor, { action: "SIMULATION_CREATE", entityType: "SIMULATION", entityId: simCode, procedureCode: code, after: ser });
    return { simulation_id: simCode, status: "SIMULATION", ...ser };
  });
}

function getSim(db: Db, simCode: string) {
  const s = db.prepare("SELECT s.*, p.code AS procedure_code, p.current_version_id FROM simulations s JOIN procedures p ON p.id = s.procedure_id WHERE s.code = ?").get(simCode) as
    | Record<string, any>
    | undefined;
  if (!s) throw new DomainError("NOT_FOUND", "Simulazione non trovata", 404);
  return s;
}

export function submitSimulation(db: Db, actor: Actor, simCode: string) {
  requireAction(actor, "simulation.create");
  const s = getSim(db, simCode);
  requireProcedure(db, actor, s.procedure_code);
  if (s.status !== "DRAFT") throw new DomainError("INVALID_TRANSITION", "Solo una bozza può essere inviata in approvazione", 409);
  tx(db, () => {
    db.prepare("UPDATE simulations SET status = 'SUBMITTED', submitted_by = ?, submitted_at = ?, version = version + 1 WHERE id = ?").run(actor.login, systemNowIso(), s.id);
    audit(db, actor, { action: "SIMULATION_SUBMIT", entityType: "SIMULATION", entityId: simCode, procedureCode: s.procedure_code });
  });
}

/** US-054 / DEC-042-043: quattro occhi, override motivato, controllo di versione, nuova ProcedureVersion. */
export function approveSimulation(db: Db, actor: Actor, simCode: string, reason: string, override = false) {
  requireAction(actor, "simulation.decide");
  const s = getSim(db, simCode);
  const p = requireProcedure(db, actor, s.procedure_code);
  if (!["DRAFT", "SUBMITTED"].includes(s.status)) throw new DomainError("INVALID_TRANSITION", `Simulazione in stato ${s.status}`, 409);
  if (s.created_by === actor.login || s.submitted_by === actor.login) throw new DomainError("FOUR_EYES_VIOLATION", "Chi propone non può approvare (quattro occhi)", 403);
  if (!reason?.trim()) throw new DomainError("VALIDATION_ERROR", "Motivazione obbligatoria", 422);
  if (s.base_version_id !== s.current_version_id) {
    db.prepare("UPDATE simulations SET status = 'STALE' WHERE id = ?").run(s.id);
    throw new DomainError("STALE_SIMULATION", "La previsione è cambiata dopo la simulazione: ricalcolarla", 409);
  }
  if (s.blocking === 1) {
    if (!override) throw new DomainError("BLOCKING_CRITICALITY_REQUIRES_OVERRIDE", "La simulazione ha criticità bloccanti: serve un override motivato", 409);
    if (!can(actor, "simulation.override")) throw new DomainError("FORBIDDEN", "Solo il Direttore Generale può forzare criticità bloccanti", 403);
  }
  // Ricalcolo a partire dalla versione corrente (deterministico)
  const ref = configuredReferenceDate(db);
  const agg = loadAggregate(db, p.id);
  const r = simulate(agg, s.source_milestone, isoDate(s.candidate_date), ref, calendarFromDb(db));
  const now = systemNowIso();
  tx(db, () => {
    const vno = (db.prepare("SELECT MAX(version_no) AS n FROM procedure_versions WHERE procedure_id = ?").get(p.id) as { n: number }).n + 1;
    const v = db
      .prepare(
        `INSERT INTO procedure_versions (procedure_id, version_no, is_baseline, label, reason, programmed_cents, simulation_id, created_by, created_at, approved_by, approved_at)
         VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(p.id, vno, `V${vno} – riprogrammazione ${simCode}`, reason, agg.programmed.cents, s.id, s.created_by, now, actor.login, now);
    const vid = Number(v.lastInsertRowid);
    const mf = db.prepare("INSERT INTO milestone_forecasts (version_id, milestone_code, date) VALUES (?, ?, ?)");
    for (const m of agg.milestones) {
      const d = r.newMilestoneDates[m.code] ?? m.forecastDate;
      if (d) mf.run(vid, m.code, d);
    }
    const fl = db.prepare("INSERT INTO forecast_lines (version_id, line_key, date, amount_cents, anchor_type, anchor_ref, source) VALUES (?, ?, ?, ?, ?, ?, ?)");
    for (const l of r.newLines) fl.run(vid, l.id, l.date, l.amount.cents, l.anchorType, l.anchorRef, l.source);
    db.prepare("UPDATE procedures SET current_version_id = ?, version = version + 1 WHERE id = ?").run(vid, p.id);
    db.prepare("UPDATE simulations SET status = 'APPROVED', decided_by = ?, decided_at = ?, decision_reason = ?, override = ? WHERE id = ?").run(actor.login, now, reason, override ? 1 : 0, s.id);
    db.prepare("UPDATE simulations SET status = 'SUPERSEDED' WHERE procedure_id = ? AND id <> ? AND status IN ('DRAFT','SUBMITTED')").run(p.id, s.id);
    audit(db, actor, {
      action: override ? "SIMULATION_APPROVE_OVERRIDE" : "SIMULATION_APPROVE",
      entityType: "PROCEDURE_VERSION",
      entityId: `${s.procedure_code}:V${vno}`,
      procedureCode: s.procedure_code,
      before: { version: s.base_version_id },
      after: serializeSimulation(r),
      reason,
    });
  });
  recheck(db, p.id);
}

export function rejectSimulation(db: Db, actor: Actor, simCode: string, reason: string) {
  requireAction(actor, "simulation.decide");
  const s = getSim(db, simCode);
  requireProcedure(db, actor, s.procedure_code);
  if (!["DRAFT", "SUBMITTED"].includes(s.status)) throw new DomainError("INVALID_TRANSITION", `Simulazione in stato ${s.status}`, 409);
  if (!reason?.trim()) throw new DomainError("VALIDATION_ERROR", "Motivazione obbligatoria", 422);
  tx(db, () => {
    db.prepare("UPDATE simulations SET status = 'REJECTED', decided_by = ?, decided_at = ?, decision_reason = ? WHERE id = ?").run(actor.login, systemNowIso(), reason, s.id);
    audit(db, actor, { action: "SIMULATION_REJECT", entityType: "SIMULATION", entityId: simCode, procedureCode: s.procedure_code, reason });
  });
}

/** US-063: transizioni SAL validate lato server. */
const SAL_TRANSITIONS: Record<string, { to: string; action: Parameters<typeof can>[1] }[]> = {
  PLANNED: [{ to: "SUBMITTED", action: "sal.submit" }],
  REJECTED: [{ to: "SUBMITTED", action: "sal.submit" }],
  SUBMITTED: [{ to: "UNDER_REVIEW", action: "sal.verify" }, { to: "REJECTED", action: "sal.verify" }, { to: "REJECTED", action: "sal.accept" }, { to: "ACCEPTED", action: "sal.accept" }],
  UNDER_REVIEW: [{ to: "ACCEPTED", action: "sal.accept" }, { to: "REJECTED", action: "sal.verify" }, { to: "REJECTED", action: "sal.accept" }],
  ACCEPTED: [{ to: "INVOICED", action: "finance.record" }],
};

export function transitionSal(db: Db, actor: Actor, code: string, seq: number, to: string, date: string, note: string | null) {
  const p = requireProcedure(db, actor, code);
  const sal = db.prepare("SELECT * FROM sals WHERE procedure_id = ? AND seq = ?").get(p.id, seq) as Record<string, any> | undefined;
  if (!sal) throw new DomainError("NOT_FOUND", "SAL non trovato", 404);
  const contract = db.prepare("SELECT signed FROM contracts WHERE procedure_id = ?").get(p.id) as { signed: number } | undefined;
  if (!contract?.signed) throw new DomainError("INVALID_TRANSITION", "Il contratto non è ancora stipulato", 409);
  const ts = SAL_TRANSITIONS[sal.state]?.filter((x) => x.to === to) ?? [];
  if (!ts.length) throw new DomainError("INVALID_TRANSITION", `Transizione ${sal.state} → ${to} non ammessa`, 409);
  requireAction(actor, (ts.find((x) => can(actor, x.action)) ?? ts[0]!).action);
  if ((to === "REJECTED" || to === "ACCEPTED") && !note?.trim()) throw new DomainError("VALIDATION_ERROR", "Nota o motivo obbligatori", 422);
  const d = isoDate(date);
  const es = engineSettings(db);
  const settings = { review: es.salReviewTermDays, pay: es.paymentTermDays };
  tx(db, () => {
    const upd: Record<string, unknown> = { state: to, note };
    if (to === "SUBMITTED") Object.assign(upd, { submitted_date: d, review_due_date: addDays(d, settings.review) });
    if (to === "ACCEPTED") upd.accepted_cents = sal.amount_cents;
    if (to === "INVOICED") Object.assign(upd, { invoice_date: d, payment_due_date: addDays(d, settings.pay) });
    const sets = Object.keys(upd).map((k) => `${k} = @${k}`).join(", ");
    db.prepare(`UPDATE sals SET ${sets}, version = version + 1 WHERE id = @id`).run({ ...upd, id: sal.id });
    audit(db, actor, { action: `SAL_${to}`, entityType: "SAL", entityId: `${code}:SAL${seq}`, procedureCode: code, before: { state: sal.state }, after: upd, reason: note });
  });
  recheck(db, p.id);
}

export function liquidateSal(db: Db, actor: Actor, code: string, seq: number, amount: string, date: string) {
  requireAction(actor, "finance.record");
  const p = requireProcedure(db, actor, code);
  const sal = db.prepare("SELECT * FROM sals WHERE procedure_id = ? AND seq = ?").get(p.id, seq) as Record<string, any> | undefined;
  if (!sal) throw new DomainError("NOT_FOUND", "SAL non trovato", 404);
  if (!["INVOICED", "ACCEPTED", "LIQUIDATED", "PARTIALLY_PAID"].includes(sal.state)) throw new DomainError("INVALID_TRANSITION", "Il SAL deve essere accettato o fatturato", 409);
  const a = Money.parse(amount);
  const accepted = Money.ofCents(BigInt(sal.accepted_cents));
  const liq = Money.ofCents(BigInt(sal.liquidated_cents));
  if (!a.gt(Money.ZERO) || liq.add(a).gt(accepted)) {
    throw new DomainError("FINANCIAL_INVARIANT_VIOLATION", "La liquidazione supera l'importo accettato del SAL", 422, { available: accepted.sub(liq).toString(), requested: a.toString() });
  }
  tx(db, () => {
    db.prepare("UPDATE sals SET liquidated_cents = ?, state = CASE WHEN state IN ('ACCEPTED','INVOICED') THEN 'LIQUIDATED' ELSE state END, version = version + 1 WHERE id = ?").run(liq.add(a).cents, sal.id);
    db.prepare("INSERT INTO financial_movements (procedure_id, type, amount_cents, year, date, reference, created_by, created_at) VALUES (?, 'LIQUIDATION', ?, ?, ?, ?, ?, ?)").run(
      p.id,
      a.cents,
      yearOf(isoDate(date)),
      date,
      `SAL ${seq}`,
      actor.login,
      systemNowIso(),
    );
    audit(db, actor, { action: "LIQUIDATION", entityType: "SAL", entityId: `${code}:SAL${seq}`, procedureCode: code, after: { amount: a.toString() } });
  });
  recheck(db, p.id);
}

/** US-064, BR-011/012, T-012, T-024: pagamento ≤ liquidato disponibile; il parziale non chiude il SAL. */
export function registerPayment(db: Db, actor: Actor, code: string, seq: number, amount: string, date: string, reference: string | null) {
  requireAction(actor, "finance.record");
  const p = requireProcedure(db, actor, code);
  const agg = loadAggregate(db, p.id);
  const sal = agg.sals.find((s) => s.seq === seq);
  if (!sal) throw new DomainError("NOT_FOUND", "SAL non trovato", 404);
  const a = Money.parse(amount);
  if (!a.gt(Money.ZERO)) throw new DomainError("VALIDATION_ERROR", "Importo non valido", 422);
  const available = sal.liquidated.sub(sal.paid);
  if (a.gt(available)) {
    throw new DomainError("FINANCIAL_INVARIANT_VIOLATION", "Il pagamento supera l'importo liquidato disponibile.", 422, { available: available.toString(), requested: a.toString() });
  }
  const totalPaid = Money.sum(agg.payments.filter((x) => x.valid).map((x) => x.amount));
  if (agg.contract && totalPaid.add(a).gt(agg.contract.gross)) {
    throw new DomainError("FINANCIAL_INVARIANT_VIOLATION", "Il pagamento supera l'importo contrattuale.", 422, { available: agg.contract.gross.sub(totalPaid).toString(), requested: a.toString() });
  }
  const newPaid = sal.paid.add(a);
  const state = newPaid.eq(sal.amount) ? "PAID" : "PARTIALLY_PAID";
  const now = systemNowIso();
  tx(db, () => {
    db.prepare("INSERT INTO payments (procedure_id, sal_seq, amount_cents, date, reference, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(p.id, seq, a.cents, date, reference, actor.login, now);
    db.prepare("INSERT INTO financial_movements (procedure_id, type, amount_cents, year, date, reference, created_by, created_at) VALUES (?, 'PAYMENT', ?, ?, ?, ?, ?, ?)").run(
      p.id,
      a.cents,
      yearOf(isoDate(date)),
      date,
      reference ?? `SAL ${seq}`,
      actor.login,
      now,
    );
    db.prepare("UPDATE sals SET state = ?, version = version + 1 WHERE procedure_id = ? AND seq = ?").run(newPaid.eq(sal.liquidated) && !newPaid.eq(sal.amount) ? "PARTIALLY_PAID" : state, p.id, seq);
    audit(db, actor, { action: "PAYMENT", entityType: "SAL", entityId: `${code}:SAL${seq}`, procedureCode: code, before: { paid: sal.paid.toString() }, after: { paid: newPaid.toString(), state }, reason: reference });
  });
  recheck(db, p.id);
}

/** Storno: scrittura compensativa, mai cancellazione. */
export function reversePayment(db: Db, actor: Actor, paymentId: number, reason: string) {
  requireAction(actor, "finance.record");
  const pay = db.prepare("SELECT x.*, p.code FROM payments x JOIN procedures p ON p.id = x.procedure_id WHERE x.id = ?").get(paymentId) as Record<string, any> | undefined;
  if (!pay) throw new DomainError("NOT_FOUND", "Pagamento non trovato", 404);
  requireProcedure(db, actor, pay.code);
  if (pay.state !== "EXECUTED") throw new DomainError("INVALID_TRANSITION", "Pagamento già stornato", 409);
  if (!reason?.trim()) throw new DomainError("VALIDATION_ERROR", "Motivazione obbligatoria", 422);
  tx(db, () => {
    db.prepare("UPDATE payments SET state = 'REVERSED' WHERE id = ?").run(paymentId);
    db.prepare("INSERT INTO financial_movements (procedure_id, type, amount_cents, year, date, reference, created_by, created_at) VALUES (?, 'REVERSAL', ?, ?, ?, ?, ?, ?)").run(
      pay.procedure_id,
      pay.amount_cents,
      yearOf(configuredReferenceDate(db)),
      configuredReferenceDate(db),
      `Storno pagamento ${paymentId}`,
      actor.login,
      systemNowIso(),
    );
    db.prepare("UPDATE sals SET state = 'LIQUIDATED' WHERE procedure_id = ? AND seq = ? AND state IN ('PAID','PARTIALLY_PAID')").run(pay.procedure_id, pay.sal_seq);
    audit(db, actor, { action: "PAYMENT_REVERSE", entityType: "PAYMENT", entityId: String(paymentId), procedureCode: pay.code, reason });
  });
  recheck(db, pay.procedure_id);
}

/** US-043 / US-041: presa in carico, risoluzione con nota, sospensione con motivo e data. */
export function handleAlert(db: Db, actor: Actor, alertId: number, op: "acknowledge" | "resolve" | "suspend", note: string | null, until: string | null) {
  requireAction(actor, op === "suspend" ? "alert.suspend" : "alert.handle");
  const a = db.prepare("SELECT a.*, p.code FROM alerts a JOIN procedures p ON p.id = a.procedure_id WHERE a.id = ?").get(alertId) as Record<string, any> | undefined;
  if (!a) throw new DomainError("NOT_FOUND", "Alert non trovato", 404);
  requireProcedure(db, actor, a.code);
  const now = systemNowIso();
  if ((op === "resolve" || op === "suspend") && !note?.trim()) throw new DomainError("VALIDATION_ERROR", "Nota obbligatoria", 422);
  if (op === "suspend" && !until) throw new DomainError("VALIDATION_ERROR", "Data di nuovo controllo obbligatoria", 422);
  tx(db, () => {
    if (op === "acknowledge") db.prepare("UPDATE alerts SET status = 'ACKNOWLEDGED', acknowledged_by = ?, acknowledged_at = ?, updated_at = ? WHERE id = ?").run(actor.login, now, now, alertId);
    if (op === "resolve") db.prepare("UPDATE alerts SET status = 'RESOLVED', resolved_by = ?, resolved_at = ?, resolution_note = ?, updated_at = ? WHERE id = ?").run(actor.login, now, note, now, alertId);
    if (op === "suspend") db.prepare("UPDATE alerts SET status = 'SUSPENDED', suspended_until = ?, suspend_reason = ?, updated_at = ? WHERE id = ?").run(until, note, now, alertId);
    audit(db, actor, { action: `ALERT_${op.toUpperCase()}`, entityType: "ALERT", entityId: String(alertId), procedureCode: a.code, before: { status: a.status }, reason: note });
  });
}

/** US-023 / US-080: decisione del validatore; l'originale resta (BR-015). */
export function decideValidation(db: Db, actor: Actor, id: number, outcome: "APPROVED" | "CORRECTED" | "REJECTED", value: string | null, note: string | null) {
  requireAction(actor, "validation.decide");
  const v = db.prepare("SELECT v.*, p.code FROM validation_items v JOIN procedures p ON p.id = v.procedure_id WHERE v.id = ?").get(id) as Record<string, any> | undefined;
  if (!v) throw new DomainError("NOT_FOUND", "Elemento non trovato", 404);
  requireProcedure(db, actor, v.code);
  if (v.status !== "OPEN") throw new DomainError("INVALID_TRANSITION", "Elemento già deciso", 409);
  if ((outcome === "CORRECTED" || outcome === "REJECTED") && !note?.trim()) throw new DomainError("VALIDATION_ERROR", "Motivazione obbligatoria", 422);
  if (outcome === "CORRECTED" && !value) throw new DomainError("VALIDATION_ERROR", "Valore corretto obbligatorio", 422);
  const now = systemNowIso();
  tx(db, () => {
    db.prepare("UPDATE validation_items SET status = ?, decision_value = ?, decided_by = ?, decided_at = ?, note = ? WHERE id = ?").run(outcome, value, actor.login, now, note, id);
    db.prepare("INSERT INTO evidences (procedure_id, field, value, source_type, document_id, locator, excerpt, method, confidence, author, created_at) VALUES (?, ?, ?, 'MANUAL', ?, ?, ?, 'VALIDATION', '1.00', ?, ?)").run(
      v.procedure_id,
      v.field,
      outcome === "REJECTED" ? v.current_value : (value ?? v.proposed_value),
      v.document_id,
      v.locator,
      note ?? `Validazione: ${outcome}`,
      actor.login,
      now,
    );
    audit(db, actor, {
      action: `VALIDATION_${outcome}`,
      entityType: "VALIDATION_ITEM",
      entityId: String(id),
      procedureCode: v.code,
      before: { proposed: v.proposed_value, current: v.current_value },
      after: { outcome, value: value ?? null },
      reason: note,
    });
  });
}

export function cancelProcedure(db: Db, actor: Actor, code: string, reason: string) {
  if (!["EXECUTIVE", "ADMIN"].includes(actor.role)) throw new DomainError("FORBIDDEN", "Solo il Direttore Generale può annullare una procedura", 403);
  const p = requireProcedure(db, actor, code);
  if (!reason?.trim()) throw new DomainError("VALIDATION_ERROR", "Motivazione obbligatoria", 422);
  const release = tx(db, () => cancelProcedureTx(db, p.id, reason, actor.login, configuredReferenceDate(db), dbClock(db)));
  recheck(db, p.id);
  return { release: release.toString() };
}

export function closeProcedure(db: Db, actor: Actor, code: string, reason: string) {
  if (!["EXECUTIVE", "ADMIN", "FINANCE_OFFICER"].includes(actor.role)) throw new DomainError("FORBIDDEN", "Operazione non consentita", 403);
  const p = requireProcedure(db, actor, code);
  const agg = loadAggregate(db, p.id);
  const unpaid = agg.contract ? agg.contract.gross.sub(Money.sum(agg.payments.filter((x) => x.valid).map((x) => x.amount))) : Money.ZERO;
  if (unpaid.gt(Money.ZERO)) throw new DomainError("INVALID_TRANSITION", "La chiusura richiede saldi coerenti: residuo da pagare non nullo", 409, { residual: unpaid.toString() });
  tx(db, () => closeProcedureTx(db, p.id, reason, actor.login, configuredReferenceDate(db), dbClock(db)));
  recheck(db, p.id);
}

export async function adminReset(db: Db, actor: Actor, confirm: string, dataset?: DatasetName) {
  requireAction(actor, "admin");
  if (confirm !== "RESET") throw new DomainError("VALIDATION_ERROR", "Conferma richiesta: digitare RESET", 422);
  return resetDemo(db, dbClock(db), actor.login, dataset);
}

export function adminRunChecks(db: Db, actor: Actor) {
  requireAction(actor, "admin");
  const r = runChecks(db, dbClock(db));
  tx(db, () => audit(db, actor, { action: "RUN_CHECKS", entityType: "SYSTEM", entityId: "run-checks", after: r }));
  return r;
}

export function adminSetReferenceDate(db: Db, actor: Actor, date: string) {
  requireAction(actor, "admin");
  const d = isoDate(date);
  const before = configuredReferenceDate(db);
  tx(db, () => {
    db.prepare("INSERT INTO config (key, value_json, updated_at, updated_by) VALUES ('demo.reference_date', ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, version = version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by").run(
      JSON.stringify(d),
      systemNowIso(),
      actor.login,
    );
    audit(db, actor, { action: "CONFIG_UPDATE", entityType: "CONFIG", entityId: "demo.reference_date", before, after: d });
  });
  return runChecks(db, dbClock(db));
}

export function impersonate(db: Db, actor: Actor, login: string) {
  requireAction(actor, "admin");
  const u = db.prepare("SELECT id FROM users WHERE login = ? AND active = 1").get(login) as { id: number } | undefined;
  if (!u) throw new DomainError("NOT_FOUND", "Utente non trovato", 404);
  return createSession(db, u.id, actor.userId);
}

export function markNotificationsRead(db: Db, actor: Actor) {
  db.prepare(
    "INSERT OR IGNORE INTO notification_reads (notification_id, user_id, read_at) SELECT id, ?, ? FROM alert_notifications WHERE user_id = ? AND channel = 'IN_APP'",
  ).run(actor.userId, systemNowIso(), actor.userId);
}
