/**
 * Importi in centesimi interi (DEC-033). Mai `number` per gli importi.
 * Money è un value object immutabile basato su bigint.
 */
export class Money {
  private constructor(readonly cents: bigint) {}

  static readonly ZERO = new Money(0n);

  static ofCents(cents: bigint): Money {
    return new Money(cents);
  }

  /** Accetta "47600.00", "47600", "-150000.00". Rifiuta più di 2 decimali. */
  static parse(value: string): Money {
    const s = value.trim();
    const m = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(s);
    if (!m) throw new MoneyFormatError(value);
    const sign = m[1] ? -1n : 1n;
    const units = BigInt(m[2] ?? "0");
    const dec = (m[3] ?? "").padEnd(2, "0");
    return new Money(sign * (units * 100n + BigInt(dec)));
  }

  /** Stringa a 2 decimali con punto (formato API/JSON). */
  toString(): string {
    const neg = this.cents < 0n;
    const abs = neg ? -this.cents : this.cents;
    const units = abs / 100n;
    const dec = (abs % 100n).toString().padStart(2, "0");
    return `${neg ? "-" : ""}${units.toString()}.${dec}`;
  }

  toJSON(): string {
    return this.toString();
  }

  /** Impedisce l'uso accidentale come numero (CR-40). */
  valueOf(): never {
    throw new TypeError("Money non può essere convertito in number");
  }

  add(o: Money): Money {
    return new Money(this.cents + o.cents);
  }
  sub(o: Money): Money {
    return new Money(this.cents - o.cents);
  }
  neg(): Money {
    return new Money(-this.cents);
  }
  isZero(): boolean {
    return this.cents === 0n;
  }
  isNegative(): boolean {
    return this.cents < 0n;
  }
  gt(o: Money): boolean {
    return this.cents > o.cents;
  }
  gte(o: Money): boolean {
    return this.cents >= o.cents;
  }
  lt(o: Money): boolean {
    return this.cents < o.cents;
  }
  lte(o: Money): boolean {
    return this.cents <= o.cents;
  }
  eq(o: Money): boolean {
    return this.cents === o.cents;
  }
  max(o: Money): Money {
    return this.cents >= o.cents ? this : o;
  }
  min(o: Money): Money {
    return this.cents <= o.cents ? this : o;
  }

  /** Percentuale espressa in centesimi di punto (20.00% = 2000n), ROUND_HALF_UP. */
  percent(pctHundredths: bigint): Money {
    return new Money(divRoundHalfUp(this.cents * pctHundredths, 10000n));
  }

  static sum(items: Iterable<Money>): Money {
    let t = 0n;
    for (const m of items) t += m.cents;
    return new Money(t);
  }
}

export class MoneyFormatError extends Error {
  constructor(value: string) {
    super(`Importo non valido: "${value}"`);
    this.name = "MoneyFormatError";
  }
}

/** Divisione intera con arrotondamento a metà lontano da zero. */
export function divRoundHalfUp(num: bigint, den: bigint): bigint {
  if (den === 0n) throw new RangeError("Divisione per zero");
  const neg = num < 0n !== den < 0n;
  const an = num < 0n ? -num : num;
  const ad = den < 0n ? -den : den;
  const q = an / ad;
  const r = an % ad;
  const rounded = r * 2n >= ad ? q + 1n : q;
  return neg ? -rounded : rounded;
}

/** Percentuale "20.00" → 2000n (centesimi di punto). */
export function parsePercent(value: string): bigint {
  const m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!m) throw new MoneyFormatError(value);
  return BigInt(m[1] ?? "0") * 100n + BigInt((m[2] ?? "").padEnd(2, "0"));
}

/**
 * Ripartizione di un totale secondo percentuali: arrotondamento HALF_UP per
 * ogni quota, l'ultima assorbe lo scarto (DEC-033).
 */
export function splitByPercent(total: Money, pcts: bigint[]): Money[] {
  if (pcts.length === 0) return [];
  const out: Money[] = [];
  let acc = Money.ZERO;
  pcts.forEach((p, i) => {
    if (i === pcts.length - 1) {
      out.push(total.sub(acc));
    } else {
      const part = total.percent(p);
      out.push(part);
      acc = acc.add(part);
    }
  });
  return out;
}
