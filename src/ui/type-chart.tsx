import { TYPE_LABEL } from "@/ui/labels";

interface Row {
  type: string;
  n: number;
}

/**
 * Gare per tipo di procedura (DEC-121): barre orizzontali, un solo colore (le categorie
 * non hanno un ordine di grandezza naturale, l'identità è già nell'etichetta di testo).
 * Ogni riga è un link al portafoglio filtrato su quel tipo (`linkFor`).
 */
export function TypeChart({ rows, linkFor }: { rows: Row[]; linkFor: (type: string) => string }) {
  const data = rows.filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
  if (data.length === 0) return <p className="muted">Nessuna gara nel perimetro filtrato.</p>;
  const max = Math.max(...data.map((r) => r.n));
  const top = data[0]!;
  const aria = `Gare per tipo di procedura. Il tipo più diffuso è ${TYPE_LABEL[top.type] ?? top.type} con ${top.n} gare. ${data.map((r) => `${TYPE_LABEL[r.type] ?? r.type}: ${r.n}`).join(", ")}.`;
  return (
    <ul className="hbar-chart" role="img" aria-label={aria}>
      {data.map((r) => {
        const label = TYPE_LABEL[r.type] ?? r.type;
        return (
          <li key={r.type}>
            <a href={linkFor(r.type)} aria-label={`${label}: ${r.n} gare. Apri il portafoglio filtrato`}>
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
