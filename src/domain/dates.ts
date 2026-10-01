/**
 * Date di business come stringhe ISO "YYYY-MM-DD" (giorni civili, fuso Europe/Rome
 * implicito). Aritmetica pura su numero di giorni: nessun uso dell'orologio di
 * sistema (DEC-002). Algoritmi civil_from_days / days_from_civil (H. Hinnant).
 */
export type IsoDate = string & { readonly __isoDate: unique symbol };

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(s: string): s is IsoDate {
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

export function isoDate(s: string): IsoDate {
  if (!isIsoDate(s)) throw new RangeError(`Data non valida: "${s}"`);
  return s;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] ?? 0;
}

export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function parts(d: IsoDate): { y: number; m: number; d: number } {
  return { y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)), d: Number(d.slice(8, 10)) };
}

export function fromParts(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` as IsoDate;
}

export function toEpochDays(date: IsoDate): number {
  let { y, m, d } = parts(date);
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (m + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromEpochDays(z0: number): IsoDate {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  return fromParts(m <= 2 ? y + 1 : y, m, d);
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return fromEpochDays(toEpochDays(d) + n);
}

/** b − a in giorni solari. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return toEpochDays(b) - toEpochDays(a);
}

/** 0 = lunedì … 6 = domenica */
export function weekday(d: IsoDate): number {
  return (((toEpochDays(d) + 3) % 7) + 7) % 7; // 1970-01-01 era giovedì
}

export function yearOf(d: IsoDate): number {
  return parts(d).y;
}

export function compare(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b;
}

/** EDATE di Excel: stesso giorno del mese spostato di n mesi, fine mese se manca (DEC-015). */
export function addMonths(date: IsoDate, n: number): IsoDate {
  const { y, m, d } = parts(date);
  const idx = y * 12 + (m - 1) + n;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return fromParts(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** Pasqua (algoritmo gregoriano anonimo). */
export function easter(y: number): IsoDate {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return fromParts(y, month, day);
}

export interface CalendarConfig {
  /** Festività fisse "MM-DD" */
  fixedHolidays: string[];
  easterMonday: boolean;
  extraHolidays: IsoDate[];
  roll: "FORWARD" | "BACKWARD" | "NONE";
}

export const ITALIAN_CALENDAR: CalendarConfig = {
  fixedHolidays: ["01-01", "01-06", "04-25", "05-01", "06-02", "08-15", "11-01", "12-08", "12-25", "12-26"],
  easterMonday: true,
  extraHolidays: [],
  roll: "FORWARD",
};

export class BusinessCalendar {
  private readonly cache = new Map<number, Set<string>>();
  constructor(readonly config: CalendarConfig = ITALIAN_CALENDAR) {}

  private holidays(y: number): Set<string> {
    let s = this.cache.get(y);
    if (!s) {
      s = new Set(this.config.fixedHolidays.map((md) => `${y}-${md}`));
      if (this.config.easterMonday) s.add(addDays(easter(y), 1));
      for (const e of this.config.extraHolidays) if (yearOf(e) === y) s.add(e);
      this.cache.set(y, s);
    }
    return s;
  }

  isHoliday(d: IsoDate): boolean {
    return this.holidays(yearOf(d)).has(d);
  }

  isBusinessDay(d: IsoDate): boolean {
    return weekday(d) < 5 && !this.isHoliday(d);
  }

  /** Sposta al giorno lavorativo secondo la regola configurata. */
  roll(d: IsoDate): IsoDate {
    if (this.config.roll === "NONE") return d;
    const step = this.config.roll === "FORWARD" ? 1 : -1;
    let x = d;
    while (!this.isBusinessDay(x)) x = addDays(x, step);
    return x;
  }

  addBusinessDays(d: IsoDate, n: number): IsoDate {
    let x = d;
    let left = n;
    while (left > 0) {
      x = addDays(x, 1);
      if (this.isBusinessDay(x)) left--;
    }
    return x;
  }
}
