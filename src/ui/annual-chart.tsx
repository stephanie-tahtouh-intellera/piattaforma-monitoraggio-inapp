import { formatEuro } from "@/contracts/format";

interface Row {
  year: number;
  need: string | null;
  available: string | null;
  baseline?: string | null;
  simulated?: string | null;
  /** previsione − baseline, calcolato dal server */
  delta?: string | null;
  /** disponibilità − previsione, calcolato dal server */
  margin?: string | null;
}

// Solo geometria del grafico: la conversione in numero non entra in nessun calcolo d'importo (eccezione guards).
const toUnits = (s: string | null | undefined) => (s ? Number.parseInt(s.split(".")[0] ?? "0", 10) : 0);

const thousands = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const signed = (s: string | null | undefined) => (s && !s.startsWith("-") && toUnits(s) > 0 ? `+${formatEuro(s)}` : formatEuro(s));

/** Passo "tondo" (1, 2, 2,5, 5 × 10^k) per un asse con circa `n` intervalli. */
function niceStep(range: number, n: number) {
  const raw = Math.max(range, 1) / n;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

/** Nessuno scostamento e nessun margine da mostrare: il grafico si riduce a una frase. */
const noBars = (rows: Row[]) => rows.every((r) => toUnits(r.delta) === 0 && toUnits(r.margin) === 0);

/** Scostamento dalla baseline e margine sulla disponibilità, per annualità (07 §6.7). */
export function AnnualChart({ rows, title = "Fabbisogno per annualità" }: { rows: Row[]; title?: string }) {
  if (rows.length === 0) return <p className="muted">Dati non disponibili.</p>;
  const hasSimulation = rows.some((r) => r.simulated);
  const overflowYears = rows.filter((r) => r.available && toUnits(r.need) > toUnits(r.available)).map((r) => r.year);
  const moved = rows.filter((r) => r.delta && toUnits(r.delta) !== 0).map((r) => r.year);
  const aria = `${title}. ${overflowYears.length ? `Previsione oltre la disponibilità nel ${overflowYears.join(", ")}.` : "Nessuna annualità oltre la disponibilità."} ${moved.length ? `Scostamento dalla baseline nel ${moved.join(", ")}.` : "Nessuno scostamento dalla baseline."} Dati in tabella sotto il grafico.`;
  return (
    <div>
      {hasSimulation ? <LevelsChart rows={rows} overflowYears={overflowYears} aria={aria} /> : <GapsChart rows={rows} aria={aria} />}
      <details open={!hasSimulation && noBars(rows)}>
        <summary>Tabella dei dati</summary>
        <div className="table-wrap" style={{ marginTop: "var(--space-2)" }}>
        <table className="data">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col">Anno</th>
              <th scope="col" className="num">Baseline</th>
              <th scope="col" className="num">Previsione approvata</th>
              {hasSimulation ? <th scope="col" className="num">Simulazione</th> : null}
              <th scope="col" className="num">Scostamento</th>
              <th scope="col" className="num">Disponibilità</th>
              <th scope="col" className="num">Margine</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <th scope="row">{r.year}</th>
                <td className="num">{formatEuro(r.baseline)}</td>
                <td className="num">{formatEuro(r.need)}</td>
                {hasSimulation ? <td className="num">{formatEuro(r.simulated)}</td> : null}
                <td className="num">{signed(r.delta)}</td>
                <td className="num">{r.available === null ? "n.d." : formatEuro(r.available)}</td>
                <td className="num">
                  {r.margin === null || r.margin === undefined ? "n.d." : signed(r.margin)}
                  {overflowYears.includes(r.year) ? <span className="badge badge-RED" style={{ marginLeft: 6 }}>Oltre disponibilità</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </details>
    </div>
  );
}

/** Barre divergenti attorno allo zero: scostamento dalla baseline e margine sulla disponibilità. */
function GapsChart({ rows, aria }: { rows: Row[]; aria: string }) {
  const series = [
    { key: "delta" as const, label: "Scostamento dalla baseline (previsione − baseline)" },
    { key: "margin" as const, label: "Margine sulla disponibilità (disponibilità − previsione)" },
  ];
  const vals = rows.flatMap((r) => [toUnits(r.delta), toUnits(r.margin)]);
  const top = Math.max(0, ...vals);
  const bottom = Math.min(0, ...vals);
  const step = niceStep(top - bottom, 4);
  const hi = Math.ceil(top / step) * step;
  const lo = Math.floor(bottom / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
  const W = 560;
  const H = 240;
  const pad = { l: 56, r: 10, b: 28, t: 10 };
  const gw = (W - pad.l - pad.r) / rows.length;
  const bw = Math.min(30, (gw - 16) / series.length);
  const span = Math.max(hi - lo, 1);
  const y = (v: number) => pad.t + ((hi - v) / span) * (H - pad.b - pad.t);
  const flat = rows.every((r) => toUnits(r.delta) === 0);
  const hasMargin = rows.some((r) => r.margin !== null && r.margin !== undefined);
  if (noBars(rows)) {
    return (
      <p className="muted" role="img" aria-label={aria}>
        Nessuno scostamento dalla baseline{hasMargin ? " e nessuna annualità oltre la disponibilità" : ""} nel {rows.map((r) => r.year).join(", ")}.
      </p>
    );
  }
  return (
    <div>
      <div className="legend" aria-hidden>
        <span><i style={{ background: "var(--chart-1)" }} />Scostamento dalla baseline (previsione − baseline)</span>
        {hasMargin ? (
          <>
            <span><i style={{ background: "var(--chart-7)" }} />Margine sulla disponibilità (disponibilità − previsione)</span>
            <span><i style={{ background: "var(--chart-overflow)" }} />Oltre disponibilità</span>
          </>
        ) : null}
      </div>
      <p className="muted" style={{ margin: "4px 0", fontSize: 12 }}>Valori in migliaia di €{flat ? " · nessuno scostamento dalla baseline in nessuna annualità" : ""}</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={aria}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">
              {thousands.format(t / 1000)}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const x0 = pad.l + i * gw + (gw - series.length * bw - 2) / 2;
          return (
            <g key={r.year}>
              {series.map((s, j) => {
                const raw = r[s.key];
                const v = toUnits(raw);
                const over = s.key === "margin" && v < 0;
                const fill = over ? "var(--chart-overflow)" : s.key === "delta" ? "var(--chart-1)" : "var(--chart-7)";
                return (
                  <rect key={s.key} x={x0 + j * (bw + 2)} y={Math.min(y(v), y(0))} width={bw} height={Math.max(Math.abs(y(v) - y(0)), v === 0 ? 0 : 1)} fill={fill} rx="2">
                    <title>{`${r.year} — ${s.key === "delta" ? "Scostamento" : "Margine"} ${signed(raw)}`}</title>
                  </rect>
                );
              })}
              <text x={x0 + (series.length * (bw + 2)) / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--chart-axis)">
                {r.year}
              </text>
              <rect className="chart-col" x={pad.l + i * gw} y={pad.t} width={gw} height={H - pad.b - pad.t} fill="transparent">
                <title>{`${r.year}\nScostamento dalla baseline: ${signed(r.delta)}\nMargine sulla disponibilità: ${signed(r.margin)}\nBaseline: ${formatEuro(r.baseline)}\nPrevisione approvata: ${formatEuro(r.need)}\nDisponibilità: ${formatEuro(r.available)}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Livelli assoluti per annualità: baseline, previsione, simulazione; disponibilità a gradino (usato quando c'è una simulazione). */
function LevelsChart({ rows, overflowYears, aria }: { rows: Row[]; overflowYears: number[]; aria: string }) {
  const series = [
    { key: "baseline", label: "Baseline", color: "var(--chart-baseline-fill)", stroke: "var(--chart-baseline-stroke)" },
    { key: "need", label: "Previsione approvata", color: "var(--chart-1)" },
    { key: "simulated", label: "Simulazione", color: "var(--chart-2)" },
  ] as const;
  const maxRaw = Math.max(1, ...rows.flatMap((r) => [toUnits(r.need), toUnits(r.available), toUnits(r.baseline), toUnits(r.simulated)]));
  const step = niceStep(maxRaw, 4);
  const max = Math.ceil(maxRaw / step) * step;
  const W = 560;
  const H = 220;
  const pad = { l: 56, b: 28, t: 10 };
  const gw = (W - pad.l - 10) / rows.length;
  const bw = Math.min(28, (gw - 16) / series.length);
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.b - pad.t);
  const ticks: number[] = [];
  for (let t = 0; t <= max + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
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
      <p className="muted" style={{ margin: "4px 0", fontSize: 12 }}>Valori in migliaia di €</p>
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
              {thousands.format(t / 1000)}
            </text>
          </g>
        ))}
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
    </div>
  );
}
