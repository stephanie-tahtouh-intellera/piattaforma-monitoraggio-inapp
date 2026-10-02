import ExcelJS from "exceljs";
import type { SeedProcedure } from "@/contracts/seed";
import { addDays, addMonths, isIsoDate, isoDate, type BusinessCalendar, type IsoDate } from "@/domain/dates";
import { selectTemplate } from "@/domain/milestones";
import type { AwardCriterion, Instrument, ProcedureType, ProcessTemplate } from "@/domain/model";
import { Money, divRoundHalfUp } from "@/domain/money";

/**
 * Import del workbook reale INAPP (foglio Gare_23-27) → record di seed (US-010, DEC-071).
 * Mappatura per intestazione normalizzata (05 §2.7–2.8): regole di qualità Q1–Q21.
 */
export interface WorkbookImportReport {
  file: string;
  sheet: string;
  rowsRead: number;
  imported: number;
  cancelled: number;
  skippedSheets: string[];
  issues: { row: number; field: string; message: string }[];
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

type CellVal = ExcelJS.CellValue;

function cellText(v: CellVal): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((x) => x.text).join("");
    if ("result" in v) return v.result === undefined || v.result === null ? "" : cellText(v.result as CellVal);
    if ("text" in v) return String((v as { text: unknown }).text);
    if ("error" in v) return "";
  }
  return String(v);
}

/** Importo da cella (numero o formula): valore in cache arrotondato a 2 decimali (Q8). */
function cellMoney(v: CellVal): Money | null {
  let n: unknown = v;
  if (v && typeof v === "object" && "result" in v) n = (v as { result: unknown }).result;
  if (typeof n === "number" && Number.isFinite(n)) return Money.parse(n.toFixed(2));
  if (typeof n === "string" && /^-?\d+([.,]\d+)?$/.test(n.trim())) return Money.parse(Number(n.replace(",", ".")).toFixed(2));
  return null;
}

/** Data da cella tipizzata o testo italiano gg/mm/aa(aa) (Q10). */
function parseItDate(text: string): IsoDate | null {
  const m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(text);
  if (!m) return null;
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  const s = `${y}-${String(Number(m[2])).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
  return isIsoDate(s) && y >= 2015 && y <= 2035 ? isoDate(s) : null;
}

function cellDate(v: CellVal): IsoDate | null {
  let x: unknown = v;
  if (v && typeof v === "object" && !(v instanceof Date) && "result" in v) x = (v as { result: unknown }).result;
  if (x instanceof Date && !Number.isNaN(x.getTime())) {
    const s = x.toISOString().slice(0, 10);
    const y = Number(s.slice(0, 4));
    return y >= 2015 && y <= 2035 ? isoDate(s) : null;
  }
  return parseItDate(cellText(v));
}

/** Atti dell'iter (colonna "Iter procedura affidamento"): proposte con data (Q16, Q17). */
export function parseIter(text: string): Partial<Record<"MEMORY" | "INDIZIONE" | "AWARD" | "CONTRACT", IsoDate>> {
  const out: Partial<Record<"MEMORY" | "INDIZIONE" | "AWARD" | "CONTRACT", IsoDate>> = {};
  for (const raw of text.split(/\r?\n|\/\/|;/)) {
    const line = raw.toLowerCase();
    const d = parseItDate(line);
    if (!d) continue;
    if (/rideterminazion|rimodulazion|revoca|addendum|modifica/.test(line)) continue;
    if (/memoria/.test(line)) out.MEMORY = d;
    else if (/indizione|a contrarre/.test(line)) out.INDIZIONE = d;
    else if (/aggiudicazion/.test(line)) out.AWARD = d;
    else if (/contratto|stipula|ordine|oda\b/.test(line)) out.CONTRACT = d;
  }
  return out;
}

const SUB_THRESHOLD_DIRECT = Money.parse("140000.00");
const EU_THRESHOLD = Money.parse("216000.00");

function classify(adopted: string, planned: string, net: Money): { type: ProcedureType; criterion: AwardCriterion | null; instrument: Instrument } {
  const a = norm(adopted);
  const meat = /vantaggios/.test(a);
  if (/trattativa diretta/.test(a)) return { type: "DIRECT_AWARD_MEPA", criterion: "LOWEST_PRICE", instrument: "MEPA" };
  if (/\boda\b|ordine diretto/.test(a)) return { type: "MEPA_ORDER", criterion: null, instrument: "MEPA" };
  if (/accordo quadro/.test(a)) return { type: "FRAMEWORK_AGREEMENT", criterion: null, instrument: "OFF_MEPA" };
  if (/rdo|negoziata/.test(a)) return { type: "NEGOTIATED", criterion: meat ? "MEAT" : "LOWEST_PRICE", instrument: "MEPA" };
  if (/aperta|ambito europeo/.test(a)) return { type: "OPEN", criterion: meat ? "MEAT" : "LOWEST_PRICE", instrument: "OFF_MEPA" };
  // Procedura non ancora adottata: dalle procedure previste e dalle soglie sul netto (DEC-036)
  const p = norm(planned);
  if (net.gte(EU_THRESHOLD) || (/sopra soglia/.test(p) && !/sotto soglia/.test(p))) return { type: "OPEN", criterion: "MEAT", instrument: "OFF_MEPA" };
  if (net.lt(SUB_THRESHOLD_DIRECT)) return { type: "DIRECT_AWARD_MEPA", criterion: "LOWEST_PRICE", instrument: "MEPA" };
  return { type: "NEGOTIATED", criterion: "LOWEST_PRICE", instrument: "MEPA" };
}

type Phase = "NONE" | "MEMORY" | "INDIZIONE" | "AWARD" | "CONTRACT" | "CANCELLED";
function phaseOf(status: string): Phase {
  const s = norm(status);
  if (/eliminat/.test(s)) return "CANCELLED";
  if (/contratt/.test(s)) return "CONTRACT";
  if (/aggiudicaz/.test(s)) return "AWARD";
  if (/indizion|indett/.test(s)) return "INDIZIONE";
  if (/memoria/.test(s)) return "MEMORY";
  return "NONE";
}

/** Date previste: memoria a ritroso (DEC-026), poi intermedie a ritroso dalla stipula = inizio attività. */
function planDates(template: ProcessTemplate, activityStart: IsoDate, cal: BusinessCalendar, actuals: Record<string, IsoDate | undefined>): Record<string, IsoDate> {
  const ms = template.milestones;
  const out: Record<string, IsoDate> = {};
  const last = ms.length - 1;
  out[ms[last]!.code] = cal.roll(activityStart);
  for (let i = last - 1; i >= 1; i--) out[ms[i]!.code] = cal.roll(addDays(out[ms[i + 1]!.code]!, -ms[i + 1]!.offsetDays));
  out[ms[0]!.code] = cal.roll(addMonths(activityStart, -template.durationMonths));
  // vincolo in avanti dalle date effettive e dalle durate minime
  let prev: IsoDate | null = null;
  for (const def of ms) {
    const a = actuals[def.code];
    if (a) {
      out[def.code] = a;
      prev = a;
      continue;
    }
    if (prev) {
      const min = addDays(prev, def.minDurationDays);
      if (out[def.code]! < min) out[def.code] = cal.roll(min);
    }
    prev = out[def.code]!;
  }
  return out;
}

export async function readInappWorkbook(
  file: string,
  templates: ProcessTemplate[],
  cal: BusinessCalendar,
  ref: IsoDate,
): Promise<{ procedures: SeedProcedure[]; report: WorkbookImportReport }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheetName = "Gare_23-27";
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`Foglio ${sheetName} non trovato`);
  const report: WorkbookImportReport = {
    file,
    sheet: sheetName,
    rowsRead: 0,
    imported: 0,
    cancelled: 0,
    skippedSheets: wb.worksheets.filter((w) => w.name !== sheetName).map((w) => `${w.name}${w.state === "visible" ? "" : " (nascosto)"}`),
    issues: [],
    byStatus: {},
    byType: {},
  };

  // Mappatura per intestazione (Q3, Q4: duplicati disambiguati con #n)
  const header = new Map<string, number>();
  ws.getRow(1).eachCell({ includeEmpty: false }, (c, col) => {
    let k = norm(cellText(c.value));
    while (header.has(k)) k += "#2";
    header.set(k, col);
  });
  const col = (name: string): number => {
    const k = [...header.keys()].find((h) => h.startsWith(norm(name)));
    if (!k) throw new Error(`Colonna "${name}" non trovata nel workbook`);
    return header.get(k)!;
  };
  const C = {
    op: col("Operazione"),
    act: col("Attività"),
    code: col("Codice Incarico"),
    title: col("Oggetto incarichi"),
    v3: col("Data prevista inizio Attività (V3)"),
    start: col("Data inizio attività (V.4"),
    end: col("Data fine attività (V.4"),
    memory: col("Data effettiva presentazione memoria"),
    cig: col("CIG"),
    programmed: col("Importo Programmato"),
    awarded: col("Importo Aggiudicato"),
    proposal: col("Proposta Riprogrammazione"),
    fee: col("importo della tassa"),
    planned: col("Procedure previste"),
    iter: col("Iter procedura"),
    status: col("Status procedura"),
    adopted: col("Procedura adottata"),
  };
  const years: { year: number; col: number }[] = [];
  for (const [h, c] of header) {
    const m = /^impegno (\d{4})$/.exec(h);
    if (m) years.push({ year: Number(m[1]), col: c });
  }

  const procedures: SeedProcedure[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const opText = cellText(row.getCell(C.op).value).trim();
    if (!/^\d+$/.test(opText)) break; // Q6: fine dati alla riga TOTALI
    report.rowsRead++;
    const issue = (field: string, message: string) => report.issues.push({ row: r, field, message });
    const codeInc = cellText(row.getCell(C.code).value).trim() || `R${r}`;
    const code = `OP${opText.padStart(2, "0")}-${codeInc}`;
    let programmed = cellMoney(row.getCell(C.programmed).value);
    if (!programmed) {
      issue("Importo Programmato", "valore mancante o non numerico: importato come 0 (MISSING)");
      programmed = Money.ZERO;
    }
    const fee = cellMoney(row.getCell(C.fee).value) ?? Money.ZERO;
    const statusText = cellText(row.getCell(C.status).value).trim();
    const phase = phaseOf(statusText);
    report.byStatus[statusText || "(vuoto)"] = (report.byStatus[statusText || "(vuoto)"] ?? 0) + 1;
    const adopted = cellText(row.getCell(C.adopted).value);
    const net = Money.ofCents(divRoundHalfUp(programmed.sub(fee).cents * 100n, 122n));
    const cls = classify(adopted, cellText(row.getCell(C.planned).value), net);
    report.byType[cls.type] = (report.byType[cls.type] ?? 0) + 1;
    const template = selectTemplate(templates, cls.type, cls.criterion, cls.instrument, "m1");

    const start = cellDate(row.getCell(C.start).value);
    const end = cellDate(row.getCell(C.end).value);
    const v3 = cellDate(row.getCell(C.v3).value);
    if (!start) issue("Data inizio attività (V.4)", "data mancante o non valida");
    const iterText = cellText(row.getCell(C.iter).value);
    const iter = parseIter(iterText);
    const memoryCell = cellDate(row.getCell(C.memory).value);
    if (memoryCell && iter.MEMORY && memoryCell !== iter.MEMORY) issue("Data effettiva presentazione memoria", `diversa dall'iter (${iter.MEMORY})`);

    // Date effettive per fase raggiunta (05 §2.7)
    const reached = { MEMORY: 1, INDIZIONE: 2, AWARD: 3, CONTRACT: 4, NONE: 0, CANCELLED: 0 }[phase];
    const memD = memoryCell ?? iter.MEMORY ?? null;
    const indD = iter.INDIZIONE ?? null;
    const awdD = iter.AWARD ?? null;
    const conD = iter.CONTRACT ?? (phase === "CONTRACT" ? start : null);
    const firstKnown = (...xs: (IsoDate | null)[]) => xs.find((x) => !!x) ?? null;
    const actuals: Record<string, IsoDate | undefined> = {};
    const set = (code: string, d: IsoDate | null) => {
      if (d && template.milestones.some((m) => m.code === code)) actuals[code] = d;
    };
    // Modulo 1 (DEC-107): ogni passo eredita la data della prossima data chiave registrata nel workbook
    // (memoria, indizione, aggiudicazione, contratto); i passi intermedi sono dedotti.
    const KEY_EVENT: Record<string, { level: number; date: IsoDate | null }> = {
      MEMORY_SUBMISSION: { level: 1, date: firstKnown(memD, indD, awdD, conD) },
      INDICTION: { level: 2, date: firstKnown(indD, awdD, conD) },
      AWARD: { level: 3, date: firstKnown(awdD, conD, indD) },
      CONTRACT_SIGNED: { level: 4, date: firstKnown(conD, start) },
    };
    const ms = template.milestones;
    for (let i = 0; i < ms.length; i++) {
      const keyDef = ms.slice(i).find((m) => KEY_EVENT[m.code]);
      const ev = keyDef ? KEY_EVENT[keyDef.code]! : null;
      if (!ev || ev.level > reached) continue;
      if (ev.date) set(ms[i]!.code, ev.date);
      else if (phase !== "CANCELLED") issue("Iter procedura affidamento", `data effettiva non disponibile per ${ms[i]!.code}`);
    }

    const anchorStart = start ?? addMonths(ref, template.durationMonths);
    const current = planDates(template, anchorStart, cal, actuals);
    const milestones: SeedProcedure["milestones"] = {};
    for (const def of template.milestones) {
      milestones[def.code] = { forecast: current[def.code], ...(actuals[def.code] ? { actual: actuals[def.code] } : {}) };
    }
    const baseline =
      v3 && start && v3 !== start ? { label: "V3 – Piano di attuazione", milestones: planDates(template, v3, cal, {}), activityStart: v3 } : undefined;

    // Impegni per annualità → righe annuali e disponibilità (DEC-030/031)
    const lines: SeedProcedure["lines"] = [];
    const budget: SeedProcedure["budget"] = [];
    for (const y of years) {
      const amt = cellMoney(row.getCell(y.col).value);
      if (!amt || amt.isZero()) continue;
      if (amt.isNegative()) {
        issue(`Impegno ${y.year}`, "importo negativo ignorato");
        continue;
      }
      let date = isoDate(`${y.year}-06-30`);
      if (start && Number(start.slice(0, 4)) === y.year && start > date) date = start;
      lines.push({ date, amount: amt.toString(), anchor: "CONTRACT_SIGNED", source: "PN_GDL" });
      budget.push({ year: y.year, amount: amt.toString(), source: "PN_GDL" });
    }

    const awarded = cellMoney(row.getCell(C.awarded).value);
    let contract: SeedProcedure["contract"];
    if (phase === "CONTRACT" || phase === "AWARD") {
      const gross = awarded ?? programmed.sub(fee);
      const netC = Money.ofCents(divRoundHalfUp(gross.cents * 100n, 122n));
      contract = {
        signed: phase === "CONTRACT",
        net: netC.toString(),
        vat: gross.sub(netC).toString(),
        gross: gross.toString(),
        ...(phase === "CONTRACT" && actuals.CONTRACT_SIGNED ? { signedDate: actuals.CONTRACT_SIGNED } : {}),
        ...(start ? { startDate: start } : {}),
        ...(end ? { endDate: end } : {}),
      };
    }

    const cig = cellText(row.getCell(C.cig).value).trim(); // Q13: sempre stringa
    const proposal = cellDate(row.getCell(C.proposal).value);
    const p: SeedProcedure = {
      code,
      title: cellText(row.getCell(C.title).value).trim() || code,
      structure: "PN_GDL",
      type: cls.type,
      ...(cls.criterion ? { awardCriterion: cls.criterion } : {}),
      instrument: cls.instrument,
      programmed: programmed.toString(),
      anacFee: fee.toString(),
      documentsTracked: false,
      ...(baseline ? { baseline, currentLabel: "V4 – Piano di attuazione" } : {}),
      ...(cig ? { cig } : { cig: "" }),
      cup: "",
      sourceKey: `${opText}-${codeInc}`,
      operation: `Operazione ${opText} – Attività ${cellText(row.getCell(C.act).value).trim()}`,
      ...(start ? { activityStart: start } : {}),
      ...(end ? { activityEnd: end } : {}),
      sourceStatus: statusText,
      iterText,
      sourceRow: r,
      milestones,
      ...(contract ? { contract } : {}),
      sals: [],
      payments: [],
      lines,
      movements:
        reached >= 2 && phase !== "CANCELLED"
          ? lines.map((l) => ({ type: "COMMITMENT" as const, amount: l.amount, year: Number(l.date.slice(0, 4)), date: actuals.INDICTION ?? l.date }))
          : [],
      budget,
      documents: [],
      events: phase === "CANCELLED" ? [{ type: "CANCEL" as const, date: firstKnown(indD, memD, start) ?? "2026-01-01", reason: "GARA ELIMINATA (workbook)" }] : [],
      extractionProposals: [],
      ...(proposal && phase !== "CONTRACT" && phase !== "CANCELLED" ? { rescheduleProposal: { source: "CONTRACT_SIGNED", candidate: proposal, note: "Proposta riprogrammazione data inizio attività (workbook)" } } : {}),
    };
    if (phase === "CANCELLED") report.cancelled++;
    procedures.push(p);
    report.imported++;
  }
  return { procedures, report };
}
