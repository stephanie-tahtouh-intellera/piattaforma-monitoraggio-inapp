import { BarList } from "@/ui/bar-list";
import { TYPE_LABEL } from "@/ui/labels";

interface Row {
  type: string;
  n: number;
}

/**
 * Procedure per tipo (DEC-121). Le barre e il comportamento del filtro stanno in
 * `BarList`; qui restano solo le etichette e la frase per il lettore di schermo.
 */
export function TypeChart({ rows, linkFor, selectedType }: { rows: Row[]; linkFor: (type: string) => string; selectedType?: string | null }) {
  const data = rows.filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
  const top = data[0];
  const aria = top
    ? `Procedure per tipo. Il tipo più diffuso è ${TYPE_LABEL[top.type] ?? top.type} con ${top.n} procedure. ${data.map((r) => `${TYPE_LABEL[r.type] ?? r.type}: ${r.n}`).join(", ")}.${selectedType ? ` Filtro attivo su ${TYPE_LABEL[selectedType] ?? selectedType}.` : ""}`
    : "Procedure per tipo.";
  return (
    <BarList
      aria={aria}
      selectedKey={selectedType}
      emptyText="Nessuna procedura nel perimetro filtrato."
      rows={data.map((r) => {
        const label = TYPE_LABEL[r.type] ?? r.type;
        return {
          key: r.type,
          label,
          value: r.n,
          href: linkFor(r.type),
          aria: `${label}: ${r.n} procedure.${r.type === selectedType ? " Filtro attivo." : ""} Apri il portafoglio filtrato`,
        };
      })}
    />
  );
}
