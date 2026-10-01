import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateIt, formatEuro } from "@/contracts/format";
import { writeAudit } from "@/infrastructure/audit";
import { configuredReferenceDate, systemNowIso } from "@/infrastructure/clock";
import { tx, type Db } from "@/infrastructure/db/connection";
import type { Actor } from "./auth";
import { require as requireAction } from "./authz";
import { alertsList, listProcedures, procedureDetail, type PortfolioFilters } from "./queries";

const STATUS_IT: Record<string, string> = {
  MEMORY_EXPECTED: "Memoria attesa", PRELIMINARY_REVIEW: "Istruttoria", TENDERING: "In gara", AWARDED: "Aggiudicata", CONTRACTING: "In stipula",
  EXECUTION: "In esecuzione", CLOSING: "Chiusura", CLOSED: "Chiusa", CANCELLED: "Annullata", DRAFT: "Bozza",
};
const HEALTH_IT: Record<string, string> = { GREEN: "Verde", AMBER: "Ambra", RED: "Rosso", NEUTRAL: "Neutro" };

function record(db: Db, actor: Actor, kind: string, filters: unknown, buf: Buffer): string {
  const sha = createHash("sha256").update(buf).digest("hex");
  tx(db, () => {
    db.prepare("INSERT INTO exports (actor, kind, filters_json, sha256, created_at) VALUES (?, ?, ?, ?, ?)").run(actor.login, kind, JSON.stringify(filters), sha, systemNowIso());
    writeAudit(db, { actor: actor.login, impersonatedBy: actor.impersonatedBy, action: "EXPORT", entityType: "EXPORT", entityId: kind, after: { filters, sha256: sha, bytes: buf.length }, at: systemNowIso() });
  });
  return sha;
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const itAmount = (s: string | null) => (s ? s.replace(".", ",") : "");

/** US-073: CSV con filtri correnti, data, utente e perimetro in testa. */
export function portfolioCsv(db: Db, actor: Actor, f: PortfolioFilters) {
  requireAction(actor, "export");
  const r = listProcedures(db, actor, { ...f, page: 1, size: 100 });
  const all = [...r.items];
  for (let p = 2; (p - 1) * 100 < r.total; p++) all.push(...listProcedures(db, actor, { ...f, page: p, size: 100 }).items);
  const head = [
    `# Export portafoglio INAPP DEMO;data di riferimento ${formatDateIt(configuredReferenceDate(db))};utente ${actor.login};filtri ${JSON.stringify(f)};righe ${all.length}`,
    ["Codice", "Oggetto", "Tipologia", "Fase", "Health", "Prossima scadenza", "Scadenza", "Programmato", "Contrattualizzato", "Pagato", "Residuo", "A rischio", "Alert aperti"].join(";"),
  ];
  const rows = all.map((p) =>
    [p.code, p.title, p.type, STATUS_IT[p.status] ?? p.status, HEALTH_IT[p.health], p.nextDeadline?.label ?? "", p.nextDeadline ? formatDateIt(p.nextDeadline.date) : "", itAmount(p.programmed), itAmount(p.contracted), itAmount(p.paid), itAmount(p.residual), itAmount(p.atRisk), p.openAlerts]
      .map(csvCell)
      .join(";"),
  );
  const buf = Buffer.from("﻿" + [...head, ...rows].join("\r\n"), "utf8");
  const sha = record(db, actor, "portfolio.csv", f, buf);
  return { buf, sha };
}

export async function portfolioXlsx(db: Db, actor: Actor, f: PortfolioFilters) {
  requireAction(actor, "export");
  const r = listProcedures(db, actor, { ...f, page: 1, size: 100 });
  const all = [...r.items];
  for (let p = 2; (p - 1) * 100 < r.total; p++) all.push(...listProcedures(db, actor, { ...f, page: p, size: 100 }).items);
  const wb = new ExcelJS.Workbook();
  wb.creator = "INAPP DEMO";
  const ws = wb.addWorksheet("Portafoglio");
  ws.addRow([`Export INAPP DEMO – dati al ${formatDateIt(configuredReferenceDate(db))} – utente ${actor.login} – ${all.length} righe – filtri ${JSON.stringify(f)}`]);
  ws.addRow(["Codice", "Oggetto", "Tipologia", "Fase", "Health", "Prossima scadenza", "Data", "Programmato", "Contrattualizzato", "Pagato", "Residuo", "A rischio"]).font = { bold: true };
  // Unica conversione ammessa Money → numero: celle di foglio di calcolo (CR-40)
  const n = (s: string | null) => (s === null ? null : Number(s));
  for (const p of all) ws.addRow([p.code, p.title, p.type, STATUS_IT[p.status] ?? p.status, HEALTH_IT[p.health], p.nextDeadline?.label ?? "", p.nextDeadline?.date ?? "", n(p.programmed), n(p.contracted), n(p.paid), n(p.residual), n(p.atRisk)]);
  for (const c of [8, 9, 10, 11, 12]) ws.getColumn(c).numFmt = "#,##0.00 €";
  ws.getColumn(2).width = 60;
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const sha = record(db, actor, "portfolio.xlsx", f, buf);
  return { buf, sha };
}

export function alertsCsv(db: Db, actor: Actor) {
  requireAction(actor, "export");
  const r = alertsList(db, actor, {}).items as any[];
  const lines = [["Procedura", "Tipo", "Regola", "Severità", "Livello", "Scadenza", "Stato", "Titolo"].join(";"), ...r.map((a) => [a.procedure_code, a.kind, a.rule, a.severity, a.current_level ?? "", a.due_date ?? "", a.status, a.title].map(csvCell).join(";"))];
  const buf = Buffer.from("﻿" + lines.join("\r\n"), "utf8");
  return { buf, sha: record(db, actor, "alerts.csv", {}, buf) };
}

/** Report PDF della procedura con fonti essenziali (US-073). */
export async function procedurePdf(db: Db, actor: Actor, code: string) {
  requireAction(actor, "export");
  const d = procedureDetail(db, actor, code);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Report ${code} – INAPP DEMO`);
  pdf.setCreator("Piattaforma INAPP DEMO");
  pdf.setCreationDate(new Date(`${d.referenceDate}T00:00:00Z`));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0, 0.208, 0.404);
  let page = pdf.addPage([595, 842]);
  let y = 800;
  const clean = (s: string) => s.replace(/[^\x20-\x7E -ÿ]/g, (c) => ({ "–": "-", "—": "-", "€": "EUR", "’": "'", "«": '"', "»": '"', "→": "->", "…": "..." })[c] ?? "?");
  const line = (text: string, opts: { size?: number; b?: boolean; color?: ReturnType<typeof rgb> } = {}) => {
    const size = opts.size ?? 10;
    const words = clean(text).split(" ");
    let cur = "";
    const flush = () => {
      if (y < 60) {
        page = pdf.addPage([595, 842]);
        y = 800;
      }
      page.drawText(cur, { x: 48, y, size, font: opts.b ? bold : font, color: opts.color ?? rgb(0.1, 0.12, 0.14) });
      y -= size + 5;
      cur = "";
    };
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if ((opts.b ? bold : font).widthOfTextAtSize(t, size) > 500) flush();
      cur = cur ? `${cur} ${w}` : w;
    }
    if (cur) flush();
  };
  page.drawRectangle({ x: 0, y: 812, width: 595, height: 30, color: rgb(1, 0.827, 0.38) });
  page.drawText("AMBIENTE DEMO - prototipo dimostrativo, non e' un documento ufficiale INAPP", { x: 48, y: 823, size: 9, font: bold });
  y = 790;
  line(`${d.procedure.code} - ${d.procedure.title}`, { size: 14, b: true, color: navy });
  line(`Report generato da ${actor.login} - dati al ${formatDateIt(d.referenceDate)}`, { size: 9 });
  y -= 6;
  const ev = d.evaluation;
  for (const [k, v] of [
    ["Fase", STATUS_IT[ev.status] ?? ev.status],
    ["Health", `${HEALTH_IT[ev.health]}${ev.healthDrivers.length ? ` - ${ev.healthDrivers.map((x) => x.message).join("; ")}` : ""}`],
    ["Tipologia / modello", `${d.procedure.type} / ${d.procedure.template}`],
    ["CIG", d.procedure.cig || "n.d."],
    ["Programmato", formatEuro(ev.programmed)],
    ["Contrattualizzato", ev.contracted ? formatEuro(ev.contracted) : "n.d."],
    ["Pagato / residuo", `${formatEuro(ev.paid)} / ${formatEuro(ev.residual)}`],
    ["Importo a rischio", `${formatEuro(ev.atRisk.total)} (non coperto ${formatEuro(ev.atRisk.uncovered)}, in slittamento ${formatEuro(ev.atRisk.slipping)})`],
    ["Prossima scadenza", ev.nextDeadline ? `${ev.nextDeadline.label} - ${formatDateIt(ev.nextDeadline.due)}` : "-"],
  ] as const)
    line(`${k}: ${v}`);
  y -= 6;
  line("Cronoprogramma (baseline / previsione / effettivo)", { b: true, color: navy });
  for (const m of d.timeline) line(`${m.label}: ${formatDateIt(m.baseline)} / ${formatDateIt(m.forecast)} / ${m.actual ? formatDateIt(m.actual) : "-"}  [${m.state}]`, { size: 9 });
  y -= 6;
  line("Annualita (fabbisogno / disponibilita)", { b: true, color: navy });
  for (const yy of ev.years) line(`${yy.year}: ${formatEuro(yy.need)} / ${yy.available === null ? "n.d." : formatEuro(yy.available)}`, { size: 9 });
  if (d.sals.length) {
    y -= 6;
    line("Piano SAL", { b: true, color: navy });
    for (const s of d.sals) line(`SAL ${s.seq} ${s.pct}% ${formatEuro(s.amount)} - ${s.state} - pagato ${formatEuro(s.paid)}`, { size: 9 });
  }
  if (d.versions.length) {
    y -= 6;
    line("Versioni", { b: true, color: navy });
    for (const v of d.versions as any[]) line(`${v.label}${v.is_baseline ? " (baseline)" : ""} - ${v.reason} - approvata da ${v.approved_by ?? "-"}`, { size: 9 });
  }
  y -= 6;
  line("Fonti: workbook/seed (SEED_FILE), atti del fascicolo (DOCUMENT), inserimenti manuali auditati (MANUAL). Valori calcolati dal motore deterministico.", { size: 8 });
  const buf = Buffer.from(await pdf.save());
  return { buf, sha: record(db, actor, `procedure.pdf:${code}`, { code }, buf) };
}
