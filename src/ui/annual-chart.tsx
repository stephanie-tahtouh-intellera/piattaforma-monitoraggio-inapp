import { formatEuro } from "@/contracts/format";

interface Row {
  year: number;
  need: string | null;
  available: string | null;
  baseline?: string | null;
  simulated?: string | null;
}

// Solo geometria del grafico: la conversione in numero non entra in nessun calcolo d'importo (eccezione guards).
const toUnits = (s: string | null | undefined) => (s ? Number.parseInt(s.split(".")[0] ?? "0", 10) : 0);

/** Barre per annualità: baseline, previsione, simulazione; disponibilità a gradino (07 §6.7). */
export function AnnualChart({ rows, title = "Fabbisogno per annualità" }: { rows: Row[]; title?: string }) {
  if (rows.length === 0) return <p className="muted">Dati non disponibili.</p>;
  const series = [
    { key: "baseline", label: "Baseline", color: "var(--chart-baseline-fill)", stroke: "var(--chart-baseline-stroke)" },
    { key: "need", label: "Previsione approvata", color: "var(--chart-1)" },
    ...(rows.some((r) => r.simulated) ? [{ key: "simulated", label: "Simulazione", color: "var(--chart-2)" }] : []),
  ] as const;
  const max = Math.max(1, ...rows.flatMap((r) => [toUnits(r.need), toUnits(r.available), toUnits(r.baseline), toUnits(r.simulated)]));
  const W = 560;
  const H = 220;
  const pad = { l: 64, b: 28, t: 10 };
  const gw = (W - pad.l - 10) / rows.length;
  const bw = Math.min(28, (gw - 16) / series.length);
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.b - pad.t);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const overflowYears = rows.filter((r) => r.available && toUnits(r.need) > toUnits(r.available)).map((r) => r.year);
  const aria = `${title}. ${overflowYears.length ? `Previsione oltre la disponibilità nel ${overflowYears.join(", ")}.` : "Nessuna annualità oltre la disponibilità."} Dati in tabella sotto il grafico.`;
  return (
    <div>
      <div className="legend" aria-hidden>
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color, border: "stroke" in s ? `1px dashed ${s.stroke}` : undefined }} />
            {s.label}
          </span>
        ))}
        <span>
          <i style={{ background: "transparent", borderTop: "2px dashed var(--chart-availability)", height: 0, width: 16 }} />
          Disponibilità
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={aria}>
        <defs>
          <pattern id="hatch-45" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="var(--chart-baseline-fill)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#fff" strokeWidth="2" />
          </pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - 10} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">
              {new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(t / 1000)}
            </text>
          </g>
        ))}
        <text x={4} y={12} fontSize="11" fill="var(--chart-axis)">migliaia di €</text>
        {rows.map((r, i) => {
          const x0 = pad.l + i * gw + 8;
          return (
            <g key={r.year}>
              {series.map((s, j) => {
                const v = toUnits(r[s.key as keyof Row] as string | null);
                const h = H - pad.b - y(v);
                return (
                  <rect key={s.key} x={x0 + j * (bw + 2)} y={y(v)} width={bw} height={Math.max(h, 0)} fill={s.key === "baseline" ? "url(#hatch-45)" : s.color} stroke={"stroke" in s ? s.stroke : "none"} rx="2">
                    <title>{`${r.year} — ${s.label} ${formatEuro(r[s.key as keyof Row] as string | null)}`}</title>
                  </rect>
                );
              })}
              {r.available ? (
                <line x1={x0 - 4} x2={x0 + series.length * (bw + 2) + 2} y1={y(toUnits(r.available))} y2={y(toUnits(r.available))} stroke={overflowYears.includes(r.year) ? "var(--chart-overflow)" : "var(--chart-availability)"} strokeWidth="2" strokeDasharray="5 3">
                  <title>{`${r.year} — Disponibilità ${formatEuro(r.available)}`}</title>
                </line>
              ) : null}
              <text x={x0 + (series.length * (bw + 2)) / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--chart-axis)">
                {r.year}
              </text>
            </g>
          );
        })}
      </svg>
      <details>
        <summary>Tabella dei dati</summary>
        <table className="data">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col">Anno</th>
              {series.map((s) => (
                <th scope="col" className="num" key={s.key}>{s.label}</th>
              ))}
              <th scope="col" className="num">Disponibilità</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <th scope="row">{r.year}</th>
                {series.map((s) => (
                  <td className="num" key={s.key}>{formatEuro(r[s.key as keyof Row] as string | null)}</td>
                ))}
                <td className="num">
                  {r.available === null ? "n.d." : formatEuro(r.available)}
                  {overflowYears.includes(r.year) ? <span className="badge badge-RED" style={{ marginLeft: 6 }}>Oltre disponibilità</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
