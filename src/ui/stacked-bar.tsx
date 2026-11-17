import Link from "next/link";
import { formatEuro, formatEuroCompact } from "@/contracts/format";

export interface StackRow {
  key: string;
  label: string;
  /** Importo come stringa in euro: nessuna aritmetica sugli importi qui dentro. */
  amount: string | null;
  /** Quota percentuale, calcolata dal server: serve solo alla geometria della barra. */
  share: number;
  href: string;
  color: string;
}

/**
 * Una sola barra divisa in segmenti, in ordine di processo da sinistra a destra
 * (DEC-130). Risponde a «a che punto sono i soldi»: la proporzione si legge dalla
 * lunghezza, l'importo esatto sta nella legenda sotto, che e' anche l'elenco testuale
 * richiesto dal documento di design (il colore da solo non puo' portare informazione).
 *
 * I segmenti sotto una certa quota restano visibili con una larghezza minima: un
 * segmento da 0,2 % sarebbe largo meno di un pixel e sparirebbe.
 */
/** Sotto il mezzo punto l'arrotondamento darebbe «0 %», che per un importo presente è falso. */
const share = (v: number) => (v < 0.5 ? "<1%" : `${Math.round(v)}%`);

export function StackedBar({ rows, aria, totalLabel, total }: { rows: StackRow[]; aria: string; totalLabel: string; total: string | null }) {
  const data = rows.filter((r) => r.share > 0);
  if (data.length === 0) return <p className="muted">Nessun importo nel perimetro filtrato.</p>;
  return (
    <div>
      <p className="splitbar-total">
        <span className="splitbar-total-label">{totalLabel}</span>
        <span className="splitbar-total-value">{formatEuroCompact(total)}</span>
      </p>
      <div className="splitbar" role="img" aria-label={aria}>
        {data.map((r) => (
          // `title`: al passaggio del mouse sul segmento si legge fase, importo e quota.
          // La stessa informazione e' nella legenda sotto, che e' il canale testuale.
          <i
            key={r.key}
            style={{ flexGrow: r.share, background: r.color }}
            title={`${r.label} — ${formatEuro(r.amount)} (${share(r.share)})`}
          />
        ))}
      </div>
      <ul className="splitbar-legend">
        {data.map((r) => (
          <li key={r.key}>
            <Link href={r.href}>
              <i style={{ background: r.color }} aria-hidden />
              <span className="splitbar-legend-label">{r.label}</span>
              <span className="splitbar-legend-value">{formatEuro(r.amount)}</span>
              <span className="splitbar-legend-share">{share(r.share)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
