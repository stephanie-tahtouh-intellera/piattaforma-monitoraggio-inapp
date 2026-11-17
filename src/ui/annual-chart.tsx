import { CircleCheck, CircleMinus, OctagonAlert } from "lucide-react";
import { formatEuro } from "@/contracts/format";
import { niceStep } from "@/ui/chart-scale";

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

/** Barra con l'estremità del dato arrotondata (4px) e il lato della baseline squadrato (dataviz §4). */
function barPath(x: number, y: number, w: number, h: number, roundTop: boolean) {
  const r = Math.min(2, h, w / 2);
  if (h <= 0) return "";
  if (roundTop) {
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  }
  return `M${x},${y} H${x + w} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} Z`;
}

/** Scostamento dalla baseline e margine sulla disponibilità, per annualità (07 §6.7). */
export function AnnualChart({ rows, title = "Fabbisogno per annualità" }: { rows: Row[]; title?: string }) {
  if (rows.length === 0) return <p className="muted">Dati non disponibili.</p>;
  const hasSimulation = rows.some((r) => r.simulated);
  const overflowYears = rows.filter((r) => r.available && toUnits(r.need) > toUnits(r.available)).map((r) => r.year);
  const moved = rows.filter((r) => r.delta && toUnits(r.delta) !== 0).map((r) => r.year);
  const aria = `${title}. ${overflowYears.length ? `Previsione oltre la disponibilità nel ${overflowYears.join(", ")}.` : "Nessuna annualità oltre la disponibilità."} ${moved.length ? `Scostamento dalla baseline nel ${moved.join(", ")}.` : "Nessuno scostamento dalla baseline."} Dati in tabella sotto il grafico.`;
  // Quello che il grafico non riesce a mostrare perche' troppo piccolo in scala, detto a
  // parole: scostamenti dalla baseline e annualita' oltre la disponibilita'.
  const movedParts = rows
    .filter((r) => r.delta && toUnits(r.delta) !== 0)
    .map((r) => `${r.year} ${signed(r.delta)}`);
  const marginParts = rows
    .filter((r) => r.margin && toUnits(r.margin) !== 0)
    .map((r) => `${r.year} ${signed(r.margin)}`);
  // Il margine in cifre non sta nel grafico: su un asse da 15 milioni, 16.000 € sono una
  // frazione di pixel. Si mostra come pastiglia accanto al titolo, che e' l'unico modo
  // perche' si veda (DEC-132). Verde = margine residuo, rosso = oltre la disponibilita'.
  const marginBadges = rows
    .filter((r) => r.available && toUnits(r.available) !== toUnits(r.need))
    .map((r) => ({
      year: r.year,
      over: overflowYears.includes(r.year),
      text: signed(r.margin),
    }));
  const note = movedParts.length ? `Scostamento dalla baseline: ${movedParts.join(", ")}.` : "Nessuno scostamento dalla baseline.";
  return (
    <div>
      {/* Sempre i livelli, anche senza simulazione (DEC-128): il grafico degli scostamenti
          restava vuoto quando non c'erano scostamenti, e il cliente a schermo vedeva un
          numero al posto di un grafico. */}
      <p className="chart-note">
        <span className="muted">{note}</span>
        {marginBadges.length ? (
          marginBadges.map((m) => (
            <span key={m.year} className={`badge ${m.over ? "badge-RED" : "badge-GREEN"}`}>
              {m.over ? <OctagonAlert size={14} aria-hidden /> : <CircleCheck size={14} aria-hidden />}
              {m.year}: {m.over ? "oltre la disponibilità" : "margine"} {m.text}
            </span>
          ))
        ) : (
          <span className="badge badge-NEUTRAL">
            <CircleMinus size={14} aria-hidden />
            Nessun margine né sforamento sulla disponibilità
          </span>
        )}
      </p>
      <LevelsChart rows={rows} overflowYears={overflowYears} aria={aria} />
      <details>
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

/** Livelli per annualità: baseline, previsione approvata, eventuale simulazione, con la disponibilità a gradino. */
function LevelsChart({ rows, overflowYears, aria }: { rows: Row[]; overflowYears: number[]; aria: string }) {
  const ALL_SERIES = [
    { key: "baseline", label: "Baseline", color: "var(--chart-baseline-fill)", stroke: "var(--chart-baseline-stroke)" },
    { key: "need", label: "Previsione approvata", color: "var(--chart-1)" },
    { key: "simulated", label: "Simulazione", color: "var(--chart-2)" },
  ] as const;
  // La baseline non si disegna (DEC-129): sul portafoglio reale differisce dalla previsione
  // di frazioni di punto percentuale, quindi affiancava a ogni anno una barra gemella che
  // occupava spazio per dire «non e' cambiato niente». La differenza, dove c'e', si legge in
  // euro nella tabella qui sotto e in una riga di testo sopra il grafico. La simulazione
  // resta, ma solo quando ce n'e' davvero una in corso.
  const series = ALL_SERIES.filter((x) => x.key !== "baseline" && rows.some((r) => toUnits(r[x.key as keyof Row] as string | null) !== 0));
  const maxRaw = Math.max(1, ...rows.flatMap((r) => [toUnits(r.need), toUnits(r.available), toUnits(r.baseline), toUnits(r.simulated)]));
  const step = niceStep(maxRaw, 4);
  const max = Math.ceil(maxRaw / step) * step;
  const W = 1040;
  const H = 260;
  const pad = { l: 64, b: 28, t: 10 };
  const gw = (W - pad.l - 10) / rows.length;
  const bw = Math.min(34, (gw - 20) / series.length);
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
        {rows.some((r) => r.available && toUnits(r.available) !== toUnits(r.need)) ? (
          <span>
            <i style={{ background: "transparent", borderTop: "2px dashed var(--chart-availability)", height: 0, width: 16 }} />
            Disponibilità, dove differisce
          </span>
        ) : null}
      </div>
      <p className="muted" style={{ margin: "4px 0", fontSize: 12 }}>Valori in migliaia di €</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ width: "100%", height: "auto", maxWidth: W }}>
        <defs>
          <pattern id="hatch-45" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="var(--chart-baseline-fill)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#fff" strokeWidth="2" />
          </pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - 10} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--chart-axis)">
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
                const h = Math.max(H - pad.b - y(v), 0);
                return (
                  <path
                    key={s.key}
                    d={barPath(x0 + j * (bw + 2), y(v), bw, h, true)}
                    fill={s.key === "baseline" ? "url(#hatch-45)" : s.color}
                    stroke={"stroke" in s ? s.stroke : "none"}
                  >
                    <title>{`${r.year} — ${s.label} ${formatEuro(r[s.key as keyof Row] as string | null)}`}</title>
                  </path>
                );
              })}
              {/* Niente linea dove disponibilita' e previsione coincidono (DEC-130): una riga
                  tratteggiata appoggiata sulla cima della barra in ogni anno faceva leggere
                  al grafico un'unica informazione, «sono uguali», che sta gia' nella nota. */}
              {r.available && toUnits(r.available) !== toUnits(r.need) ? (
                <g>
                  {/* Bersaglio invisibile alto 14px: la linea e' spessa 3px e da sola
                      sarebbe quasi impossibile da centrare con il puntatore. */}
                  <line
                    x1={x0 - 10}
                    x2={x0 + series.length * (bw + 2) + 8}
                    y1={y(toUnits(r.available))}
                    y2={y(toUnits(r.available))}
                    stroke="transparent"
                    strokeWidth="14"
                  >
                    <title>{`${r.year} — Disponibilità ${formatEuro(r.available)} · Previsione ${formatEuro(r.need)} · Margine ${signed(r.margin)}`}</title>
                  </line>
                  <line
                    x1={x0 - 6}
                    x2={x0 + series.length * (bw + 2) + 4}
                    y1={y(toUnits(r.available))}
                    y2={y(toUnits(r.available))}
                    stroke={overflowYears.includes(r.year) ? "var(--chart-overflow)" : "var(--chart-availability)"}
                    strokeWidth="3"
                    strokeDasharray="6 3"
                    pointerEvents="none"
                  />
                </g>
              ) : null}
              {r.margin && toUnits(r.margin) !== 0 ? (
                <text x={x0 + series.length * (bw + 2) + 10} y={y(toUnits(r.available)) - 6} fontSize="11" fill="var(--chart-axis)">
                  {signed(r.margin)}
                </text>
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
