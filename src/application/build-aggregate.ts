import type { SeedProcedure } from "@/contracts/seed";
import { addDays, isoDate, type BusinessCalendar, type IsoDate } from "@/domain/dates";
import { selectTemplate } from "@/domain/milestones";
import type { ForecastLine, MilestoneInstance, ProcedureAggregate, ProcessTemplate, SalInstance, TemplateFamily } from "@/domain/model";
import { Money, parsePercent, splitByPercent } from "@/domain/money";

const d = (s: string | undefined | null): IsoDate | null => (s ? isoDate(s) : null);

/**
 * Converte un record di seed in aggregato di dominio. Le date previste mancanti
 * si generano dal modello (offset di default dal predecessore, DEC-020).
 */
export function buildAggregateFromSeed(
  p: SeedProcedure,
  templates: ProcessTemplate[],
  cal: BusinessCalendar,
  opts: { salReviewTermDays: number; paymentTermDays: number },
  family: TemplateFamily = "v1",
): ProcedureAggregate {
  const template = selectTemplate(templates, p.type, p.awardCriterion ?? null, p.instrument ?? null, family);
  const milestones: MilestoneInstance[] = [];
  let prev: IsoDate | null = null;
  for (const def of template.milestones) {
    const s = p.milestones[def.code];
    const actual = d(s?.actual);
    let forecast = d(s?.forecast) ?? d(s?.baseline);
    if (!forecast) {
      if (actual) forecast = actual;
      else if (prev) forecast = cal.roll(addDays(prev, def.offsetDays));
    }
    milestones.push({
      code: def.code,
      baselineDate: d(s?.baseline) ?? forecast,
      forecastDate: forecast,
      actualDate: actual,
      manualState: s?.manualState ?? null,
      manualBlocker: s?.blocker ?? null,
    });
    prev = actual ?? forecast ?? prev;
  }

  const gross = p.contract ? Money.parse(p.contract.gross) : Money.parse(p.programmed);
  const pcts = p.sals.map((s) => parsePercent(s.pct));
  const amounts = splitByPercent(gross, pcts);
  const sals: SalInstance[] = p.sals.map((s, i) => {
    const amount = amounts[i] ?? Money.ZERO;
    const submitted = d(s.submittedDate);
    const invoice = d(s.invoiceDate);
    return {
      seq: s.seq,
      pctHundredths: pcts[i] ?? 0n,
      amount,
      state: s.state,
      dueDate: d(s.dueDate),
      submittedDate: submitted,
      reviewDueDate: submitted ? addDays(submitted, opts.salReviewTermDays) : null,
      invoiceDate: invoice,
      paymentDueDate: invoice ? addDays(invoice, opts.paymentTermDays) : null,
      accepted: s.accepted ? Money.parse(s.accepted) : Money.ZERO,
      liquidated: s.liquidated ? Money.parse(s.liquidated) : Money.ZERO,
      paid: Money.ZERO,
    };
  });

  const payments = p.payments.map((x) => ({ salSeq: x.sal, amount: Money.parse(x.amount), date: isoDate(x.date), valid: true }));
  for (const s of sals) s.paid = Money.sum(payments.filter((x) => x.salSeq === s.seq).map((x) => x.amount));

  const lines: ForecastLine[] = p.lines.map((l, i) => ({
    id: `${p.code}-L${i + 1}`,
    date: isoDate(l.date),
    amount: Money.parse(l.amount),
    anchorType: /^SAL\d+$/.test(l.anchor) ? "SAL" : "MILESTONE",
    anchorRef: l.anchor,
    source: l.source ?? null,
  }));

  return {
    code: p.code,
    title: p.title,
    structureCode: p.structure,
    procedureType: p.type,
    awardCriterion: p.awardCriterion ?? null,
    instrument: p.instrument ?? null,
    draft: false,
    cancelled: p.events.some((e) => e.type === "CANCEL"),
    closed: p.events.some((e) => e.type === "CLOSE"),
    programmed: Money.parse(p.programmed),
    costComponents: p.anacFee ? Money.parse(p.anacFee) : Money.ZERO,
    template,
    milestones,
    contract: p.contract
      ? {
          signed: p.contract.signed,
          net: Money.parse(p.contract.net),
          vat: Money.parse(p.contract.vat),
          gross: Money.parse(p.contract.gross),
          supplierName: p.contract.supplier ?? null,
          signedDate: d(p.contract.signedDate),
          startDate: d(p.contract.startDate),
          endDate: d(p.contract.endDate),
        }
      : null,
    sals,
    payments,
    forecastLines: lines,
    budget: p.budget.map((b) => ({ year: b.year, source: b.source ?? "ORDINARIO_DEMO", amount: Money.parse(b.amount) })),
    movements: p.movements.map((m) => ({ type: m.type, amount: Money.parse(m.amount), year: m.year, date: isoDate(m.date) })),
    documents: p.documents.map((x) => ({ type: x.type, subtype: x.subtype ?? null })),
    documentsTracked: p.documentsTracked ?? true,
  };
}
