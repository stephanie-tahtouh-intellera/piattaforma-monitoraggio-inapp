import { divRoundHalfUp, Money } from "./money";

/**
 * Quadro economico calcolato deterministicamente. Percentuali espresse in centesimi di punto.
 */
export const DEFAULT_VAT_PCT = 2200n;
export const MAX_INCENTIVE_PCT = 200n;

export type IncentivesDecision = "YES" | "NO" | "TO_VERIFY";

/**
 * Regole ricevute da INAPP il 2026-11-25 (DEC-147), tutte DA VALIDARE (domande aperte nel registro).
 * - FLAT_PCT: percentuale unica indicata a mano (regola originaria, usata da seed, oracle e bozze precedenti).
 * - SCALED: scaglioni progressivi sulla base IVA esclusa; 80% (art. 45 c.2) più IRAP a carico del finanziamento,
 *   20% (art. 45 c.5) al fondo e fuori dall'importo a disposizione.
 */
export type IncentiveMethod = "FLAT_PCT" | "SCALED";

/** Soglia comunitaria usata negli scaglioni: dedotta dall'esempio dell'Ufficio Bilancio (6.286,72 € su 347.781,25 €). DA VALIDARE. */
export const DEFAULT_EU_THRESHOLD = Money.parse("214000.00");
const INCENTIVE_STEPS: { upTo: Money | null; pct: bigint }[] = [
  { upTo: null, pct: 200n }, // fino alla soglia comunitaria (il limite è DEFAULT_EU_THRESHOLD)
  { upTo: Money.parse("500000.00"), pct: 150n },
  { upTo: Money.parse("800000.00"), pct: 120n },
  { upTo: null, pct: 100n },
];
/** Quota dell'incentivo a carico del finanziamento (art. 45 c.2) e IRAP su di essa, in centesimi di punto. */
export const INCENTIVE_PERSONNEL_PCT = 8000n;
export const IRAP_PCT = 850n;

/** Contributo ANAC a carico della stazione appaltante, per fasce di base di gara (IVA esclusa): importo = quota della fascia. */
const ANAC_BANDS: { from: Money; fee: Money }[] = [
  { from: Money.ZERO, fee: Money.ZERO },
  { from: Money.parse("40000.00"), fee: Money.parse("35.00") },
  { from: Money.parse("150000.00"), fee: Money.parse("250.00") },
  { from: Money.parse("500000.00"), fee: Money.parse("410.00") },
  { from: Money.parse("1000000.00"), fee: Money.parse("660.00") },
  { from: Money.parse("5000000.00"), fee: Money.parse("880.00") },
];

export function anacFeeForBase(base: Money): Money {
  let fee = Money.ZERO;
  for (const b of ANAC_BANDS) if (base.cents >= b.from.cents) fee = b.fee;
  return fee;
}

export interface ScaledIncentive {
  /** D: incentivo complessivo sulla base IVA esclusa. */
  total: Money;
  /** E: 80% (art. 45 c.2), arrotondato per difetto. */
  personnel: Money;
  /** F: 20% (art. 45 c.5), differenza: va al fondo, non entra nell'importo a disposizione. */
  fund: Money;
  /** G: IRAP su E. */
  irap: Money;
}

export function scaledIncentive(base: Money, euThreshold: Money = DEFAULT_EU_THRESHOLD): ScaledIncentive {
  const limits = [euThreshold, INCENTIVE_STEPS[1]!.upTo!, INCENTIVE_STEPS[2]!.upTo!];
  let weighted = 0n;
  let lower = 0n;
  for (let i = 0; i < INCENTIVE_STEPS.length; i++) {
    const upper = i < limits.length ? limits[i]!.cents : base.cents;
    const slice = (base.cents < upper ? base.cents : upper) - lower;
    if (slice > 0n) weighted += slice * INCENTIVE_STEPS[i]!.pct;
    lower = upper > lower ? upper : lower;
    if (base.cents <= lower) break;
  }
  const total = Money.ofCents(divRoundHalfUp(weighted, 10000n));
  const personnel = Money.ofCents((total.cents * INCENTIVE_PERSONNEL_PCT) / 10000n);
  return { total, personnel, fund: total.sub(personnel), irap: personnel.percent(IRAP_PCT) };
}

export interface EconomicFrameInput {
  /** Base di gara senza IVA. */
  base: Money;
  vatPct?: bigint;
  /** Contributo ANAC a carico della stazione appaltante; se omesso lo calcola la tabella per fasce (DEC-147). */
  anacFee?: Money | undefined;
  incentivesDecision: IncentivesDecision;
  incentivePct?: bigint | null;
  /** Default FLAT_PCT (regola originaria); SCALED applica scaglioni, 80/20 e IRAP. */
  incentiveMethod?: IncentiveMethod;
  euThreshold?: Money;
  incentivesReduceAvailable?: boolean;
}

export interface EconomicFrame {
  base: Money;
  vatPct: bigint;
  vat: Money;
  /** Base + IVA: l'importo del contratto. */
  gross: Money;
  anacFee: Money;
  incentivesDecision: IncentivesDecision;
  incentivePct: bigint | null;
  /** Quota dell'incentivo che entra nell'importo a disposizione (con SCALED: 80% più IRAP). */
  incentive: Money;
  incentiveMethod: IncentiveMethod;
  /** Dettaglio del calcolo: incentivo complessivo, quota 80%, quota 20% al fondo, IRAP sull'80%. */
  incentiveTotal: Money;
  incentivePersonnel: Money;
  incentiveFund: Money;
  irap: Money;
  incentivesReduceAvailable: boolean;
  total: Money;
}

export function computeEconomicFrame(i: EconomicFrameInput): EconomicFrame {
  const vatPct = i.vatPct ?? DEFAULT_VAT_PCT;
  const method: IncentiveMethod = i.incentiveMethod ?? "FLAT_PCT";
  const anacFee = i.anacFee ?? anacFeeForBase(i.base);
  const flatPct = i.incentivesDecision === "YES" && method === "FLAT_PCT" ? (i.incentivePct ?? null) : null;
  if (i.base.isNegative() || anacFee.isNegative()) throw new RangeError("Gli importi non possono essere negativi");
  if (vatPct < 0n || (flatPct !== null && flatPct < 0n)) throw new RangeError("Le percentuali non possono essere negative");
  const vat = i.base.percent(vatPct);
  const gross = i.base.add(vat);

  let incentive = Money.ZERO;
  let incentivePct: bigint | null = flatPct;
  let parts: ScaledIncentive = { total: Money.ZERO, personnel: Money.ZERO, fund: Money.ZERO, irap: Money.ZERO };
  if (flatPct !== null) {
    incentive = i.base.percent(flatPct);
    parts = { total: incentive, personnel: incentive, fund: Money.ZERO, irap: Money.ZERO };
  } else if (i.incentivesDecision === "YES" && method === "SCALED") {
    parts = scaledIncentive(i.base, i.euThreshold);
    // A carico dell'importo a disposizione: 80% (art. 45 c.2) più IRAP; il 20% (c.5) resta fuori
    incentive = parts.personnel.add(parts.irap);
    incentivePct = i.base.cents === 0n ? 0n : divRoundHalfUp(parts.total.cents * 10000n, i.base.cents);
  }
  const incentivesReduceAvailable = i.incentivesReduceAvailable ?? false;
  const total = gross.add(anacFee).add(incentivesReduceAvailable ? incentive.neg() : incentive);
  if (total.isNegative()) throw new RangeError("Gli incentivi superano l'importo a disposizione della struttura");
  return {
    base: i.base,
    vatPct,
    vat,
    gross,
    anacFee,
    incentivesDecision: i.incentivesDecision,
    incentivePct,
    incentive,
    incentiveMethod: method,
    incentiveTotal: parts.total,
    incentivePersonnel: parts.personnel,
    incentiveFund: parts.fund,
    irap: parts.irap,
    incentivesReduceAvailable,
    total,
  };
}

/** Rappresentazione API: importi come stringhe "47600.00", percentuali come "22.00". */
export function frameToJson(f: EconomicFrame) {
  const pct = (p: bigint) => `${p / 100n}.${(p % 100n).toString().padStart(2, "0")}`;
  return {
    base: f.base.toString(),
    vat_pct: pct(f.vatPct),
    vat: f.vat.toString(),
    gross: f.gross.toString(),
    anac_fee: f.anacFee.toString(),
    incentives_decision: f.incentivesDecision,
    incentive_pct: f.incentivePct === null ? "" : pct(f.incentivePct),
    incentive: f.incentive.toString(),
    incentive_method: f.incentiveMethod,
    incentive_total: f.incentiveTotal.toString(),
    incentive_personnel: f.incentivePersonnel.toString(),
    incentive_fund: f.incentiveFund.toString(),
    irap: f.irap.toString(),
    incentives_reduce_available: f.incentivesReduceAvailable,
    incentive_over_cap: f.incentiveMethod === "FLAT_PCT" && f.incentivePct !== null && f.incentivePct > MAX_INCENTIVE_PCT,
    total: f.total.toString(),
  };
}

/** "2.00" → 200n; accetta anche la virgola. Rifiuta più di 2 decimali. */
export function parsePct(value: string): bigint {
  const m = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!m) throw new RangeError(`Percentuale non valida: "${value}"`);
  return BigInt(m[1]!) * 100n + BigInt((m[2] ?? "").padEnd(2, "0") || "0");
}
