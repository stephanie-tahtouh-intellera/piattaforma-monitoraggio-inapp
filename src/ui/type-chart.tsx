import { TYPE_LABEL } from "@/ui/labels";

interface Row {
  type: string;
  n: number;
}

const CHART_COLORS = ["chart-1", "chart-4", "chart-5", "chart-8", "chart-2", "chart-3", "chart-7"];

/** Istogramma del numero di gare per tipo di procedura (DEC-121): sola lettura, nessun calcolo d'importo. */
export function TypeChart({ rows }: { rows: Row[] }) {
  const data = rows.filter((r) => r.n > 0);
  if (data.length === 0) return <p className="muted">Nessuna gara nel perimetro filtrato.</p>;
  const max = Math.max(...data.map((r) => r.n));
  const top = data.reduce((a, b) => (b.n > a.n ? b : a));
  const aria = `Gare per tipo di procedura. Il tipo più diffuso è ${TYPE_LABEL[top.type] ?? top.type} con ${top.n} gare. Dati in tabella sotto il grafico.`;
  const W = 640;
  const H = 220;
  const pad = { l: 8, r: 8, b: 56, t: 20 };
  const gw = (W - pad.l - pad.r) / data.length;
  const bw = Math.min(56, gw - 16);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.b - pad.t);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ width: "100%", height: "auto", maxWidth: 640 }}>
        <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="var(--chart-grid)" />
        {data.map((r, i) => {
          const x = pad.l + i * gw + (gw - bw) / 2;
          const h = (H - pad.b - pad.t) * (r.n / max);
          const color = `var(--${CHART_COLORS[i % CHART_COLORS.length]})`;
          const label = TYPE_LABEL[r.type] ?? r.type;
          return (
            <g key={r.type}>
              <rect x={x} y={y(r.n)} width={bw} height={h} rx={2} fill={color} />
              <text x={x + bw / 2} y={y(r.n) - 6} textAnchor="middle" fontSize={12} fill="var(--chart-axis)">
                {r.n}
              </text>
              <text x={x + bw / 2} y={H - pad.b + 16} textAnchor="middle" fontSize={11} fill="var(--chart-axis)">
                {label.length > 16 ? `${label.slice(0, 15)}…` : label}
                <title>{label}</title>
              </text>
            </g>
          );
        })}
      </svg>
      <details>
        <summary>Tabella dei dati</summary>
        <div className="table-wrap" style={{ marginTop: "var(--space-2)" }}>
          <table className="data">
            <caption className="sr-only">Gare per tipo di procedura</caption>
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col" className="num">Gare</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.type}>
                  <th scope="row">{TYPE_LABEL[r.type] ?? r.type}</th>
                  <td className="num">{r.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
