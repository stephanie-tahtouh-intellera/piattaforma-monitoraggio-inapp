export interface BarRow {
  /** Chiave stabile della riga (tipo, stato, owner…). */
  key: string;
  label: string;
  value: number;
  /** Destinazione della riga: senza indirizzo la riga è testo, non un link. */
  href?: string;
  /** Frase per il lettore di schermo al posto di quella generata. */
  aria?: string;
}

/**
 * Barre orizzontali, un solo colore (DEC-121): le categorie non hanno un ordine di
 * grandezza naturale e l'identità sta già nell'etichetta di testo, quindi colorare
 * le barre per valore direbbe due volte la stessa cosa.
 *
 * `keepOrder` tiene l'ordine ricevuto invece di ordinare per valore: serve quando le
 * righe sono una sequenza (le fasi del processo), dove riordinare per quantità
 * distruggerebbe l'informazione principale, cioè dove si accumulano le procedure.
 * `selectedKey` attenua le righe non selezionate invece di nasconderle, così si vede
 * sia il totale sia quale riga è filtrata.
 */
export function BarList({
  rows,
  aria,
  selectedKey,
  keepOrder,
  emptyText,
}: {
  rows: BarRow[];
  aria: string;
  selectedKey?: string | null;
  keepOrder?: boolean;
  emptyText: string;
}) {
  const data = keepOrder ? rows.filter((r) => r.value > 0) : rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  if (data.length === 0) return <p className="muted">{emptyText}</p>;
  const max = Math.max(...data.map((r) => r.value));
  return (
    // Niente role="img" sulla lista: azzererebbe la semantica dei <li> e vieterebbe elementi
    // focalizzabili al suo interno (axe: listitem + nested-interactive). La lista porta il
    // proprio nome accessibile con aria-label, e ogni riga ha la sua etichetta.
    <ul className="hbar-chart" aria-label={aria}>
      {data.map((r) => {
        const isSelected = r.key === selectedKey;
        const isDimmed = Boolean(selectedKey) && !isSelected;
        const inner = (
          <>
            <span className="hbar-label">{r.label}</span>
            <span className="hbar-track">
              <span className="hbar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
            <span className="hbar-value">{r.value}</span>
          </>
        );
        return (
          <li key={r.key} className={isDimmed ? "hbar-dim" : undefined}>
            {r.href ? (
              <a href={r.href} aria-label={r.aria ?? `${r.label}: ${r.value}`} aria-current={isSelected ? "true" : undefined}>
                {inner}
              </a>
            ) : (
              <span className="hbar-row">{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
