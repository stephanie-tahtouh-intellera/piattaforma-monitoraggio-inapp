import { hashSync } from "@node-rs/argon2";
import { DomainError } from "@/application/errors";
import { calendarFromDb, runChecks } from "@/application/run-checks";
import { ARGON_OPTS, familyOfDataset } from "@/application/seed-loader";
import { addDays, addMonths, isoDate, type IsoDate } from "@/domain/dates";
import { selectTemplate } from "@/domain/milestones";
import { DEFAULT_SETTINGS, ROLES, type AwardCriterion, type EngineSettings, type Instrument, type ProcedureType, type Role } from "@/domain/model";
import { computeEconomicFrame, DEFAULT_INCENTIVE_PCT, DEFAULT_VAT_PCT } from "@/domain/economic-frame";
import { Money } from "@/domain/money";
import { writeAudit } from "@/infrastructure/audit";
import { configuredReferenceDate, dbClock, systemNowIso } from "@/infrastructure/clock";
import { loadTemplates } from "@/infrastructure/config/templates";
import { tx, type Db } from "@/infrastructure/db/connection";
import { loadAggregate } from "@/infrastructure/repo/procedures";
import type { Actor } from "./auth";
import { require as requireAction, requireProcedure } from "./authz";

const audit = (db: Db, actor: Actor, e: Omit<Parameters<typeof writeAudit>[1], "actor" | "at" | "impersonatedBy">) =>
  writeAudit(db, { ...e, actor: actor.login, impersonatedBy: actor.impersonatedBy, at: systemNowIso() });

export interface DraftInput {
  title: string;
  type: ProcedureType;
  awardCriterion?: AwardCriterion | undefined;
  instrument?: Instrument | undefined;
  /** Importo programmato IVA inclusa (percorso senza quadro economico, usato da seed e test). */
  programmed?: string | undefined;
  /** Quadro economico (DEC-111): se presente, il programmato è calcolato e `programmed` è ignorato. */
  frame?: { base: string; vatPct?: bigint | undefined; anacFee?: string | undefined; hasDec: boolean; incentivePct?: bigint | undefined } | undefined;
  annual: Record<string, string>;
  memoryDue: string;
}

/** US-013: bozza della Struttura; ogni salvataggio è una versione di bozza, la baseline nasce alla consegna della memoria (DEC-024). */
export async function createDraft(db: Db, actor: Actor, input: DraftInput): Promise<{ code: string }> {
  if (!(actor.role === "STRUCTURE_USER" || actor.role === "ADMIN")) throw new DomainError("FORBIDDEN", "Solo la Struttura richiedente può creare una bozza", 403);
  const structure = actor.role === "STRUCTURE_USER" && actor.structureScope !== "*" ? actor.structureScope : "PN_GDL";
  if (!input.frame && !input.programmed) throw new DomainError("VALIDATION_ERROR", "Indica la base di gara o l'importo programmato", 422);
  const frame = input.frame
    ? computeEconomicFrame({ base: Money.parse(input.frame.base), vatPct: input.frame.vatPct ?? DEFAULT_VAT_PCT, anacFee: Money.parse(input.frame.anacFee || "0"), hasDec: input.frame.hasDec, incentivePct: input.frame.incentivePct ?? DEFAULT_INCENTIVE_PCT })
    : null;
  const programmed = frame ? frame.total : Money.parse(input.programmed!);
  const annual = Object.entries(input.annual).filter(([, v]) => v && v !== "0").map(([y, v]) => ({ year: Number(y), amount: Money.parse(v) }));
  const sum = Money.sum(annual.map((a) => a.amount));
  if (!sum.eq(programmed)) throw new DomainError("VALIDATION_ERROR", `Il riparto per annualità (${sum.toString()}) deve coincidere con l'importo a disposizione della struttura (${programmed.toString()})`, 422);
  const memoryDue = isoDate(input.memoryDue);
  if (memoryDue < (await configuredReferenceDate(db))) throw new DomainError("VALIDATION_ERROR", "La data obiettivo della memoria non può essere nel passato", 422);
  const templates = loadTemplates();
  const dataset = ((await db.prepare("SELECT value FROM system_meta WHERE key = 'dataset'").get()) as { value: string } | undefined)?.value;
  const template = selectTemplate(templates, input.type, input.awardCriterion ?? null, input.instrument ?? null, familyOfDataset(dataset));
  const cal = await calendarFromDb(db);
  const now = systemNowIso();
  const created = await tx(db, async (db) => {
    const n = ((await db.prepare("SELECT COUNT(*) AS n FROM procedures WHERE code LIKE 'BZ-%'").get()) as { n: number }).n + 1;
    const code = `BZ-${String(n).padStart(3, "0")}`;
    const insProc = await db
      .prepare(
        `INSERT INTO procedures (code, dataset, title, structure_code, procedure_type, award_criterion, instrument, template_code, programmed_cents, cig, cup, is_draft, created_by, created_at,
             base_cents, vat_pct_hundredths, anac_fee_cents, has_dec, incentive_pct_hundredths, incentive_cents)
           VALUES (?, 'user', ?, ?, ?, ?, ?, ?, ?, '', '', 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        code,
        input.title,
        structure,
        input.type,
        input.awardCriterion ?? null,
        input.instrument ?? null,
        template.code,
        programmed.cents,
        actor.login,
        now,
        frame ? frame.base.cents : null,
        Number(frame ? frame.vatPct : DEFAULT_VAT_PCT),
        frame ? frame.anacFee.cents : 0,
        frame?.hasDec ? 1 : 0,
        Number(frame?.hasDec ? frame.incentivePct : 0n),
        frame ? frame.incentive.cents : 0,
      );
    const pid = Number(insProc.lastInsertRowid);
    const insVer = await db
      .prepare("INSERT INTO procedure_versions (procedure_id, version_no, is_baseline, label, reason, programmed_cents, created_by, created_at) VALUES (?, 1, 0, 'Bozza 1', 'Creazione bozza', ?, ?, ?)")
      .run(pid, programmed.cents, actor.login, now);
    const vid = Number(insVer.lastInsertRowid);
    await db.prepare("UPDATE procedures SET current_version_id = ? WHERE id = ?").run(vid, pid);
    let prev: IsoDate | null = null;
    for (const def of template.milestones) {
      const d: IsoDate = prev === null ? cal.roll(memoryDue) : cal.roll(addDays(prev, def.offsetDays));
      await db.prepare("INSERT INTO milestone_forecasts (version_id, milestone_code, date) VALUES (?, ?, ?)").run(vid, def.code, d);
      await db.prepare("INSERT INTO milestones (procedure_id, code) VALUES (?, ?)").run(pid, def.code);
      prev = d;
    }
    for (let i = 0; i < annual.length; i++) {
      const a = annual[i]!;
      await db
        .prepare("INSERT INTO forecast_lines (version_id, line_key, date, amount_cents, anchor_type, anchor_ref, source) VALUES (?, ?, ?, ?, 'MILESTONE', 'CONTRACT_SIGNED', 'BOZZA')")
        .run(vid, `${code}-L${i + 1}`, `${a.year}-06-30`, a.amount.cents);
      await db.prepare("INSERT INTO budget_allocations (procedure_id, year, source, amount_cents) VALUES (?, ?, 'ORDINARIO_DEMO', ?)").run(pid, a.year, a.amount.cents);
    }
    await db
      .prepare("INSERT INTO evidences (procedure_id, field, value, source_type, method, confidence, author, created_at) VALUES (?, 'programmed', ?, 'MANUAL', 'MANUAL', '1.00', ?, ?)")
      .run(pid, programmed.toString(), actor.login, now);
    await audit(db, actor, { action: "DRAFT_CREATE", entityType: "PROCEDURE", entityId: code, procedureCode: code, after: { ...input } });
    return { code, pid };
  });
  await runChecks(db, await dbClock(db), { procedureIds: [created.pid] });
  return { code: created.code };
}

/** Consegna della memoria: congela la baseline e passa la titolarità all'Ufficio Gare (US-013, US-033). */
export async function submitMemory(db: Db, actor: Actor, code: string, date: string, note: string | null): Promise<void> {
  const p = await requireProcedure(db, actor, code);
  if (!(actor.role === "STRUCTURE_USER" || actor.role === "ADMIN")) throw new DomainError("FORBIDDEN", "La memoria è consegnata dalla Struttura richiedente", 403);
  const row = (await db.prepare("SELECT is_draft, current_version_id FROM procedures WHERE id = ?").get(p.id)) as { is_draft: number; current_version_id: number };
  if (!row.is_draft) throw new DomainError("INVALID_TRANSITION", "La procedura non è in bozza", 409);
  const d = isoDate(date);
  if (d > (await configuredReferenceDate(db))) throw new DomainError("VALIDATION_ERROR", "La data di consegna non può essere futura", 422);
  const agg = await loadAggregate(db, p.id);
  const now = systemNowIso();
  await tx(db, async (db) => {
    const vno = ((await db.prepare("SELECT MAX(version_no) AS n FROM procedure_versions WHERE procedure_id = ?").get(p.id)) as { n: number }).n + 1;
    const insVer = await db
      .prepare(
        "INSERT INTO procedure_versions (procedure_id, version_no, is_baseline, label, reason, programmed_cents, created_by, created_at, approved_by, approved_at) VALUES (?, ?, 1, ?, 'Consegna memoria: baseline congelata', ?, ?, ?, ?, ?)",
      )
      .run(p.id, vno, `V${vno} – baseline`, agg.programmed.cents, actor.login, now, actor.login, now);
    const vid = Number(insVer.lastInsertRowid);
    for (const m of agg.milestones) if (m.forecastDate) await db.prepare("INSERT INTO milestone_forecasts (version_id, milestone_code, date) VALUES (?, ?, ?)").run(vid, m.code, m.forecastDate);
    for (const l of agg.forecastLines)
      await db
        .prepare("INSERT INTO forecast_lines (version_id, line_key, date, amount_cents, anchor_type, anchor_ref, source) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(vid, l.id, l.date, l.amount.cents, l.anchorType, l.anchorRef, l.source);
    await db.prepare("UPDATE procedures SET is_draft = 0, current_version_id = ?, version = version + 1 WHERE id = ?").run(vid, p.id);
    await db.prepare("UPDATE milestones SET actual_date = ?, completed_by = ?, completed_at = ?, note = ? WHERE procedure_id = ? AND code = 'MEMORY_SUBMISSION'").run(d, actor.login, now, note, p.id);
    await db
      .prepare("INSERT INTO evidences (procedure_id, field, value, source_type, excerpt, method, confidence, author, created_at) VALUES (?, 'milestone.MEMORY_SUBMISSION.actual', ?, 'MANUAL', ?, 'MANUAL', '1.00', ?, ?)")
      .run(p.id, d, note, actor.login, now);
    await audit(db, actor, { action: "MEMORY_SUBMIT", entityType: "PROCEDURE", entityId: code, procedureCode: code, before: { owner: "STRUCTURE" }, after: { owner: "PROCUREMENT", baseline: `V${vno}` }, reason: note });
  });
  await runChecks(db, await dbClock(db), { procedureIds: [p.id] });
}

/** US-101: soglie e calendario versionati e auditati; si applicano dai controlli successivi (non retroattivi sui dati). */
export async function updateEngineSettings(db: Db, actor: Actor, s: Partial<EngineSettings>, extraHolidays: string[] | undefined) {
  requireAction(actor, "admin");
  const cur = (await db.prepare("SELECT value_json FROM config WHERE key='engine.settings'").get()) as { value_json: string } | undefined;
  const before = cur ? (JSON.parse(cur.value_json) as EngineSettings) : DEFAULT_SETTINGS;
  const next = { ...before, ...s };
  if (next.reminderThresholdDays > next.attentionWindowDays) throw new DomainError("VALIDATION_ERROR", "La soglia di reminder non può superare la finestra di attenzione", 422);
  for (const v of Object.values(next)) if (!Number.isInteger(v) || v < 0 || v > 120) throw new DomainError("VALIDATION_ERROR", "Valori ammessi: interi tra 0 e 120 giorni", 422);
  await tx(db, async (db) => {
    const upsert = db.prepare(
      "INSERT INTO config (key, value_json, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, version = config.version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by",
    );
    await upsert.run("engine.settings", JSON.stringify(next), systemNowIso(), actor.login);
    if (extraHolidays) await upsert.run("calendar.extra_holidays", JSON.stringify(extraHolidays.map((d) => isoDate(d))), systemNowIso(), actor.login);
    await audit(db, actor, { action: "CONFIG_UPDATE", entityType: "CONFIG", entityId: "engine.settings", before, after: { ...next, extraHolidays } });
  });
  return runChecks(db, await dbClock(db));
}

/** US-102: utenti, ruoli e ambiti; disattivazione senza cancellazione (resta nello storico). */
export async function upsertUser(db: Db, actor: Actor, u: { login: string; name: string; role: Role; structureScope: string; supplier?: string | null; active: boolean; password?: string | undefined }) {
  requireAction(actor, "admin");
  if (!ROLES.includes(u.role)) throw new DomainError("VALIDATION_ERROR", "Ruolo non valido", 422);
  if (!/^[a-z0-9.\-_]{3,40}$/.test(u.login)) throw new DomainError("VALIDATION_ERROR", "Login: 3–40 caratteri minuscoli, numeri, punto o trattino", 422);
  const before = (await db.prepare("SELECT login, name, role, structure_scope, supplier_code, active FROM users WHERE login = ?").get(u.login)) as Record<string, unknown> | undefined;
  await tx(db, async (db) => {
    if (before) {
      await db
        .prepare("UPDATE users SET name = ?, role = ?, structure_scope = ?, supplier_code = ?, active = ? WHERE login = ?")
        .run(u.name, u.role, u.structureScope || "*", u.supplier || null, u.active ? 1 : 0, u.login);
      if (!u.active) await db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = (SELECT id FROM users WHERE login = ?) AND revoked_at IS NULL").run(systemNowIso(), u.login);
    } else {
      const pwd = u.password ?? process.env.DEMO_PASSWORD ?? "Demo2026!";
      await db
        .prepare("INSERT INTO users (login, name, email, password_hash, role, structure_scope, supplier_code, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(u.login, u.name, `${u.login}@demo.invalid`, hashSync(pwd, ARGON_OPTS), u.role, u.structureScope || "*", u.supplier || null, u.active ? 1 : 0);
    }
    await audit(db, actor, { action: "PERMISSION_CHANGE", entityType: "USER", entityId: u.login, before: before ?? null, after: { name: u.name, role: u.role, structureScope: u.structureScope, supplier: u.supplier ?? null, active: u.active }, reason: "Gestione utenti (US-102)" });
  });
}

export { addMonths };
