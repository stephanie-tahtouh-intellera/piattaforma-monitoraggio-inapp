import { Money } from "./money";

/**
 * Quadro economico calcolato deterministicamente. Percentuali espresse in centesimi di punto.
 */
export const DEFAULT_VAT_PCT = 2200n;
export const MAX_INCENTIVE_PCT = 200n;

export type IncentivesDecision = "YES" | "NO" | "TO_VERIFY";

export interface EconomicFrameInput {
  /** Base di gara senza IVA. */
  base: Money;
  vatPct?: bigint;
  /** Contributo ANAC a carico della stazione appaltante (importo fisso). */
  anacFee: Money;
  incentivesDecision: IncentivesDecision;
  incentivePct?: bigint | null;
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
  incentive: Money;
  incentivesReduceAvailable: boolean;
  total: Money;
}

export function computeEconomicFrame(i: EconomicFrameInput): EconomicFrame {
  const vatPct = i.vatPct ?? DEFAULT_VAT_PCT;
  const incentivePct = i.incentivesDecision === "YES" ? (i.incentivePct ?? null) : null;
  if (i.base.isNegative() || i.anacFee.isNegative()) throw new RangeError("Gli importi non possono essere negativi");
  if (vatPct < 0n || (incentivePct !== null && incentivePct < 0n)) throw new RangeError("Le percentuali non possono essere negative");
  const vat = i.base.percent(vatPct);
  const gross = i.base.add(vat);
  const incentive = incentivePct === null ? Money.ZERO : i.base.percent(incentivePct);
  const incentivesReduceAvailable = i.incentivesReduceAvailable ?? false;
  const total = gross.add(i.anacFee).add(incentivesReduceAvailable ? incentive.neg() : incentive);
  if (total.isNegative()) throw new RangeError("Gli incentivi superano l'importo a disposizione della struttura");
  return {
    base: i.base,
    vatPct,
    vat,
    gross,
    anacFee: i.anacFee,
    incentivesDecision: i.incentivesDecision,
    incentivePct,
    incentive,
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
    incentives_reduce_available: f.incentivesReduceAvailable,
    incentive_over_cap: f.incentivePct !== null && f.incentivePct > MAX_INCENTIVE_PCT,
    total: f.total.toString(),
  };
}

/** "2.00" → 200n; accetta anche la virgola. Rifiuta più di 2 decimali. */
export function parsePct(value: string): bigint {
  const m = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!m) throw new RangeError(`Percentuale non valida: "${value}"`);
  return BigInt(m[1]!) * 100n + BigInt((m[2] ?? "").padEnd(2, "0") || "0");
}
