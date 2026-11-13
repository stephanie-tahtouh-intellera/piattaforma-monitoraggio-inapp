/** Formattazione it-IT condivisa (DEC-081): importi da stringa, nessuna aritmetica. */
const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", useGrouping: "always" } as Intl.NumberFormatOptions);
const euroCompact = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });
const euroNoCents = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions);

export function formatEuro(amount: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "n.d.";
  return euro.format(amount as unknown as number); // Intl accetta stringhe decimali esatte (NumberFormat v3)
}

/**
 * Importo abbreviato per le card KPI. In it-IT la notazione compatta **non** abbrevia le
 * migliaia (580850 → "580.850,0 €": nessuna sigla e un decimale spurio) e inizia ad aiutare
 * solo dal milione ("29,1 Mln €"). Sotto il milione si mostra quindi l'importo intero senza
 * centesimi, che la riga sotto la card riporta comunque per esteso.
 * La soglia si legge dalle cifre della parte intera: nessuna aritmetica sugli importi.
 */
export function formatEuroCompact(amount: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "n.d.";
  const integerDigits = String(amount).split(".")[0]!.replace("-", "").length;
  if (integerDigits <= 6) return euroNoCents.format(amount as unknown as number);
  return euroCompact.format(amount as unknown as number);
}

const pct2 = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Percentuale già calcolata dal dominio ("12.34" → "12,34 %"): solo presentazione. */
export function formatPercentIt(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "n.d.";
  return `${pct2.format(value as unknown as number)} %`;
}

export function formatDateIt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function formatDateTimeIt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" }).format(d);
}

/** Converte "47600.00" in centesimi senza passare dai float. */
export function centsToString(cents: number | bigint | null | undefined): string | null {
  if (cents === null || cents === undefined) return null;
  const c = BigInt(cents);
  const neg = c < 0n;
  const a = neg ? -c : c;
  return `${neg ? "-" : ""}${(a / 100n).toString()}.${(a % 100n).toString().padStart(2, "0")}`;
}
