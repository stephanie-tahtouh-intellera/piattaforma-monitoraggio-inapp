import { Money } from "./money";

/**
 * Quadro economico della procedura, calcolato dalla Struttura prima della memoria (DEC-111).
 * Solo aritmetica deterministica su `Money`; aliquote e percentuali sono parametri `DA VALIDARE`.
 * Percentuali in centesimi di punto (22,00 % = 2200n, 2,00 % = 200n).
 */
export const DEFAULT_VAT_PCT = 2200n;
/** Tetto degli incentivi per funzioni tecniche sulla base di gara (D.Lgs. 36/2023, art. 45, DA VALIDARE). */
export const DEFAULT_INCENTIVE_PCT = 200n;
/** Quota degli incentivi destinata al personale; il resto va al fondo per l'innovazione (DA VALIDARE). */
export const INCENTIVE_PERSONNEL_SHARE_PCT = 8000n;

export interface EconomicFrameInput {
  /** Base di gara senza IVA. */
  base: Money;
  vatPct?: bigint;
  /** Contributo ANAC a carico della stazione appaltante (importo fisso). */
  anacFee: Money;
  /** Presenza del DEC / direttore dell'esecuzione: senza, non maturano incentivi. */
  hasDec: boolean;
  incentivePct?: bigint;
}

export interface EconomicFrame {
  base: Money;
  vatPct: bigint;
  vat: Money;
  /** Base + IVA: l'importo del contratto. */
  gross: Money;
  anacFee: Money;
  hasDec: boolean;
  incentivePct: bigint;
  incentive: Money;
  incentivePersonnel: Money;
  incentiveFund: Money;
  /** Importo a disposizione della struttura: contratto + tassa gara + incentivi. È il «programmato». */
  total: Money;
}

export function computeEconomicFrame(i: EconomicFrameInput): EconomicFrame {
  const vatPct = i.vatPct ?? DEFAULT_VAT_PCT;
  const incentivePct = i.incentivePct ?? DEFAULT_INCENTIVE_PCT;
  if (i.base.isNegative() || i.anacFee.isNegative()) throw new RangeError("Gli importi non possono essere negativi");
  if (vatPct < 0n || incentivePct < 0n) throw new RangeError("Le percentuali non possono essere negative");
  const vat = i.base.percent(vatPct);
  const gross = i.base.add(vat);
  const incentive = i.hasDec ? i.base.percent(incentivePct) : Money.ZERO;
  const incentivePersonnel = incentive.percent(INCENTIVE_PERSONNEL_SHARE_PCT);
  return {
    base: i.base,
    vatPct,
    vat,
    gross,
    anacFee: i.anacFee,
    hasDec: i.hasDec,
    incentivePct,
    incentive,
    incentivePersonnel,
    incentiveFund: incentive.sub(incentivePersonnel),
    total: gross.add(i.anacFee).add(incentive),
  };
}

/** Rappresentazione per API e UI: importi come stringhe "47600.00", percentuali come "22.00". */
export function frameToJson(f: EconomicFrame) {
  const pct = (p: bigint) => `${p / 100n}.${(p % 100n).toString().padStart(2, "0")}`;
  return {
    base: f.base.toString(),
    vat_pct: pct(f.vatPct),
    vat: f.vat.toString(),
    gross: f.gross.toString(),
    anac_fee: f.anacFee.toString(),
    has_dec: f.hasDec,
    incentive_pct: pct(f.incentivePct),
    incentive: f.incentive.toString(),
    incentive_personnel: f.incentivePersonnel.toString(),
    incentive_fund: f.incentiveFund.toString(),
    total: f.total.toString(),
  };
}

/** "2.00" → 200n; accetta anche la virgola. Rifiuta più di 2 decimali. */
export function parsePct(value: string): bigint {
  const m = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!m) throw new RangeError(`Percentuale non valida: "${value}"`);
  return BigInt(m[1]!) * 100n + BigInt((m[2] ?? "").padEnd(2, "0") || "0");
}
