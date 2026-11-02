import { divRoundHalfUp, Money } from "./money";

/**
 * KPI per gara (DEC-111, incremento 5): base di gara, aggiudicato, ribasso, programmato (= importo a disposizione della struttura).
 * Solo logica deterministica su interi (`Money`, `bigint`); nessun `number` sugli importi.
 */
export interface GaraKpiInput {
  /** Importo programmato IVA inclusa, che comprende tassa gara e incentivi (DEC-111, incremento 1). */
  programmed: Money;
  /** Base di gara IVA esclusa inserita nella bozza; assente per le procedure importate dal workbook. */
  base: Money | null;
  anacFee: Money;
  incentive: Money;
  /** Aliquota IVA in centesimi di punto (2200 = 22,00 %). */
  vatPctHundredths: bigint;
  /** Importo aggiudicato IVA esclusa e inclusa, se la procedura è stata aggiudicata (contratto presente). */
  awardedNet: Money | null;
  awardedGross: Money | null;
}

export interface GaraKpi {
  programmed: Money;
  base: Money | null;
  /** true se la base non è stata inserita ma ricavata dal programmato togliendo tassa gara, incentivi e IVA. */
  baseDerived: boolean;
  awardedNet: Money | null;
  awardedGross: Money | null;
  /** Ribasso in centesimi di punto ((base − aggiudicato) / base): 1234n = 12,34 %; negativo se l'aggiudicato supera la base. */
  ribassoHundredths: bigint | null;
}

/** Base di gara ricavata dal programmato: (programmato − tassa gara − incentivi) / (1 + IVA), arrotondata ai centesimi. */
export function derivedBase(programmed: Money, anacFee: Money, incentive: Money, vatPctHundredths: bigint): Money {
  const gross = programmed.cents - anacFee.cents - incentive.cents;
  return Money.ofCents(divRoundHalfUp(gross * 10000n, 10000n + vatPctHundredths));
}

/** Ribasso in centesimi di punto, ROUND_HALF_UP; nullo se manca la base o l'aggiudicato. */
export function ribassoHundredths(base: Money | null, awardedNet: Money | null): bigint | null {
  if (!base || !awardedNet || base.cents <= 0n) return null;
  return divRoundHalfUp((base.cents - awardedNet.cents) * 10000n, base.cents);
}

/** Centesimi di punto → stringa decimale ("1234" → "12.34", "-50" → "-0.50"). */
export function hundredthsToString(h: bigint): string {
  const neg = h < 0n;
  const a = neg ? -h : h;
  const s = `${a / 100n}.${(a % 100n).toString().padStart(2, "0")}`;
  return neg ? `-${s}` : s;
}

export function garaKpi(i: GaraKpiInput): GaraKpi {
  const hasBase = i.base !== null;
  const base = i.base ?? derivedBase(i.programmed, i.anacFee, i.incentive, i.vatPctHundredths);
  return {
    programmed: i.programmed,
    base,
    baseDerived: !hasBase,
    awardedNet: i.awardedNet,
    awardedGross: i.awardedGross,
    ribassoHundredths: ribassoHundredths(base, i.awardedNet),
  };
}

export interface GaraTotals {
  count: number;
  awardedCount: number;
  programmed: Money;
  base: Money;
  awardedNet: Money;
  /** Ribasso medio ponderato sulle sole gare aggiudicate: (Σ base − Σ aggiudicato) / Σ base. */
  ribassoHundredths: bigint | null;
}

export function garaTotals(list: GaraKpi[]): GaraTotals {
  const awarded = list.filter((k) => k.awardedNet !== null && k.base !== null);
  const baseOfAwarded = Money.sum(awarded.map((k) => k.base!));
  const awardedNet = Money.sum(awarded.map((k) => k.awardedNet!));
  return {
    count: list.length,
    awardedCount: awarded.length,
    programmed: Money.sum(list.map((k) => k.programmed)),
    base: Money.sum(list.filter((k) => k.base !== null).map((k) => k.base!)),
    awardedNet,
    ribassoHundredths: awarded.length ? ribassoHundredths(baseOfAwarded, awardedNet) : null,
  };
}
