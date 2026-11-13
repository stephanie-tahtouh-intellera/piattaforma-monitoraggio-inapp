import { TYPE_LABEL } from "@/ui/labels";

interface Row {
  type: string;
  n: number;
}

/**
 * Procedure per tipo (DEC-121): barre orizzontali, un solo colore (le categorie
 * non hanno un ordine di grandezza naturale, l'identità è già nell'etichetta di testo).
 * Ogni riga è un link al portafoglio filtrato su quel tipo (`linkFor`). Con un filtro
 * per tipo attivo (`selectedType`) le barre non selezionate restano visibili ma attenuate,
 * cosi' si vede sia il totale per tipo sia quale tipo e' filtrato (invece di far sparire le altre).
 */
export function TypeChart({ rows, linkFor, selectedType }: { rows: Row[]; linkFor: (type: string) => string; selectedType?: string | null }) {
  const data = rows.filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
  if (data.length === 0) return <p className="muted">Nessuna procedura nel perimetro filtrato.</p>;
  const max = Math.max(...data.map((r) => r.n));
  const top = data[0]!;
  const aria = `Procedure per tipo. Il tipo più diffuso è ${TYPE_LABEL[top.type] ?? top.type} con ${top.n} procedure. ${data.map((r) => `${TYPE_LABEL[r.type] ?? r.type}: ${r.n}`).join(", ")}.${selectedType ? ` Filtro attivo su ${TYPE_LABEL[selectedType] ?? selectedType}.` : ""}`;
  return (
    <ul className="hbar-chart" role="img" aria-label={aria}>
      {data.map((r) => {
        const label = TYPE_LABEL[r.type] ?? r.type;
        const isSelected = r.type === selectedType;
        const isDimmed = Boolean(selectedType) && !isSelected;
        return (
          <li key={r.type} className={isDimmed ? "hbar-dim" : undefined}>
            <a href={linkFor(r.type)} aria-label={`${label}: ${r.n} procedure.${isSelected ? " Filtro attivo." : ""} Apri il portafoglio filtrato`} aria-current={isSelected ? "true" : undefined}>
              <span className="hbar-label">{label}</span>
              <span className="hbar-track">
                <span className="hbar-fill" style={{ width: `${(r.n / max) * 100}%` }} />
              </span>
              <span className="hbar-value">{r.n}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
