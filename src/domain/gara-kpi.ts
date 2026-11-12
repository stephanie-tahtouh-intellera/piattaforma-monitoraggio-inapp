import { daysBetween, type IsoDate } from "./dates";
import type { ProcedureType } from "./model";
import { divRoundHalfUp, Money } from "./money";

/**
 * KPI per gara (DEC-111, incremento 5; DEC-120): base di gara, aggiudicato, ribasso, programmato (= importo a disposizione della struttura).
 * Solo logica deterministica su interi (`Money`, `bigint`); nessun `number` sugli importi.
 */

/**
 * Procedure con gara competitiva (variante B, DEC-107): negoziata, aperta, accordo quadro. Solo per queste il ribasso
 * (base − aggiudicato) ha senso: nella variante A (affidamento diretto, ODA/TD MePA, ordinativo/adesione Consip, DEC-107)
 * non c'è una base di gara concorrenziale, quindi il ribasso non è un KPI significativo (DEC-120).
 */
const COMPETITIVE_PROCEDURE_TYPES: ReadonlySet<ProcedureType> = new Set(["NEGOTIATED", "OPEN", "FRAMEWORK_AGREEMENT"]);

export function isCompetitiveProcedureType(type: ProcedureType): boolean {
  return COMPETITIVE_PROCEDURE_TYPES.has(type);
}

export interface GaraKpiInput {
  procedureType: ProcedureType;
  /** Importo programmato IVA inclusa, che comprende tassa gara e incentivi (DEC-111, incremento 1). */
  programmed: Money;
  /** Base di gara IVA esclusa inserita nella bozza; assente per le procedure importate dal workbook. */
  base: Money | null;
  anacFee: Money;
  /** Incentivi presenti nel quadro economico; i record storici restano invariati. */
  incentive: Money;
  /** Aliquota IVA in centesimi di punto (2200 = 22,00 %). */
  vatPctHundredths: bigint;
  /** Importo aggiudicato IVA esclusa e inclusa, se la procedura è stata aggiudicata (contratto presente). */
  awardedNet: Money | null;
  awardedGross: Money | null;
}

export interface GaraKpi {
  procedureType: ProcedureType;
  /** true per le procedure a gara competitiva (variante B, DEC-107); solo per queste il ribasso è significativo (DEC-120). */
  competitive: boolean;
  programmed: Money;
  base: Money | null;
  /** true se la base non è stata inserita ma ricavata dal programmato togliendo tassa gara, incentivi e IVA. */
  baseDerived: boolean;
  awardedNet: Money | null;
  awardedGross: Money | null;
  /** Ribasso in centesimi di punto ((base − aggiudicato) / base): 1234n = 12,34 %; negativo se l'aggiudicato supera la base.
   *  Nullo anche quando la procedura non è competitiva (DEC-120): il ribasso non si applica alla variante A. */
  ribassoHundredths: bigint | null;
}

/** Base ricavata dai componenti fuori contratto: (programmato − tassa − incentivi) / (1 + IVA). */
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
  const competitive = isCompetitiveProcedureType(i.procedureType);
  return {
    procedureType: i.procedureType,
    competitive,
    programmed: i.programmed,
    base,
    baseDerived: !hasBase,
    awardedNet: i.awardedNet,
    awardedGross: i.awardedGross,
    ribassoHundredths: competitive ? ribassoHundredths(base, i.awardedNet) : null,
  };
}

export interface GaraTotals {
  count: number;
  awardedCount: number;
  programmed: Money;
  base: Money;
  awardedNet: Money;
  /** Gare aggiudicate e competitive (variante B) su cui è ponderato il ribasso (DEC-120). */
  competitiveAwardedCount: number;
  /** Ribasso medio ponderato sulle sole gare competitive e aggiudicate: (Σ base − Σ aggiudicato) / Σ base (DEC-120). */
  ribassoHundredths: bigint | null;
  /** Programmato sulle sole gare competitive (variante B, DEC-120). */
  programmedCompetitive: Money;
  /** Quota del programmato sulle gare competitive (variante B), in centesimi di punto; nullo se il programmato totale è zero (DEC-120). */
  competitiveProgrammedShareHundredths: bigint | null;
}

export function garaTotals(list: GaraKpi[]): GaraTotals {
  const awarded = list.filter((k) => k.awardedNet !== null && k.base !== null);
  const competitiveAwarded = awarded.filter((k) => k.competitive);
  const baseOfCompetitive = Money.sum(competitiveAwarded.map((k) => k.base!));
  const awardedNetOfCompetitive = Money.sum(competitiveAwarded.map((k) => k.awardedNet!));
  const programmed = Money.sum(list.map((k) => k.programmed));
  const programmedCompetitive = Money.sum(list.filter((k) => k.competitive).map((k) => k.programmed));
  return {
    count: list.length,
    awardedCount: awarded.length,
    programmed,
    base: Money.sum(list.filter((k) => k.base !== null).map((k) => k.base!)),
    awardedNet: Money.sum(awarded.map((k) => k.awardedNet!)),
    competitiveAwardedCount: competitiveAwarded.length,
    ribassoHundredths: competitiveAwarded.length ? ribassoHundredths(baseOfCompetitive, awardedNetOfCompetitive) : null,
    programmedCompetitive,
    competitiveProgrammedShareHundredths: programmed.cents > 0n ? divRoundHalfUp(programmedCompetitive.cents * 10000n, programmed.cents) : null,
  };
}

/**
 * Giorni fra indizione e aggiudicazione (milestone `INDICTION` e `AWARD`, chiavi dello schema di processo, DEC-107);
 * nullo finché l'una o l'altra data effettiva manca.
 */
export function awardDurationDays(indictionDate: IsoDate | null, awardDate: IsoDate | null): number | null {
  return indictionDate && awardDate ? daysBetween(indictionDate, awardDate) : null;
}

/** Media intera dei giorni di aggiudicazione sulle sole gare per cui la durata è nota; nulla se nessuna lo è. */
export function averageAwardDurationDays(durations: (number | null)[]): number | null {
  const valid = durations.filter((d): d is number => d !== null);
  if (!valid.length) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
