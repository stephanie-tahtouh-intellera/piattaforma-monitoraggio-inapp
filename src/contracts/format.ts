/** Formattazione it-IT condivisa (DEC-081): importi da stringa, nessuna aritmetica. */
const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", useGrouping: "always" } as Intl.NumberFormatOptions);
const euroCompact = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });

export function formatEuro(amount: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "n.d.";
  return euro.format(amount as unknown as number); // Intl accetta stringhe decimali esatte (NumberFormat v3)
}

export function formatEuroCompact(amount: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "n.d.";
  return euroCompact.format(amount as unknown as number);
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
