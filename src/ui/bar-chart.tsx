import { ticksTo } from "@/ui/chart-scale";

export interface BarRow {
  /** Chiave stabile della riga (tipo, stato, owner…). */
  key: string;
  label: string;
  value: number;
  /** Destinazione della riga: senza indirizzo la barra non è cliccabile. */
  href?: string;
  /** Frase per il lettore di schermo al posto di quella generata. */
  aria?: string;
}

const W = 900;
const LABEL_W = 250;
const VALUE_W = 44;
const ROW_H = 30;
const BAR_H = 16;
const AXIS_H = 26;
const TOP = 6;

/**
 * Barre orizzontali con asse dei valori e griglia (07 §6.7). Un solo colore (DEC-121):
 * le categorie non hanno un ordine di grandezza naturale e l'identità sta già
 * nell'etichetta, quindi colorare le barre per valore direbbe due volte la stessa cosa.
 *
 * Orizzontali e non a colonne perché le etichette sono frasi italiane lunghe
 * («Memoria presentata – istruttoria»): sotto una colonna andrebbero ruotate.
 *
 * `keepOrder` tiene l'ordine ricevuto invece di ordinare per valore: serve quando le
 * righe sono una sequenza (le fasi del processo), dove riordinare per quantità
 * nasconderebbe proprio dove si accumulano le procedure.
 * `selectedKey` attenua le barre non selezionate invece di nasconderle.
 */
export function BarChart({
  rows,
  aria,
  selectedKey,
  keepOrder,
  emptyText,
  unit = "",
}: {
  rows: BarRow[];
  aria: string;
  selectedKey?: string | null;
  keepOrder?: boolean;
  emptyText: string;
  /** Unità ripetuta nella frase accessibile, es. "procedure". */
  unit?: string;
}) {
  const data = keepOrder ? rows.filter((r) => r.value > 0) : rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  if (data.length === 0) return <p className="muted">{emptyText}</p>;

  const { ticks, hi } = ticksTo(Math.max(...data.map((r) => r.value)), 4);
  const plotL = LABEL_W;
  const plotR = W - VALUE_W;
  const plotW = plotR - plotL;
  const H = TOP + data.length * ROW_H + AXIS_H;
  const x = (v: number) => plotL + (v / hi) * plotW;
  const baseY = TOP + data.length * ROW_H;

  return (
    // Niente role="img": le barre sono link, e un contenitore dichiarato immagine
    // vieterebbe elementi focalizzabili al suo interno (axe: nested-interactive).
    <svg className="bar-chart" viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} aria-label={aria}>
      {/* Griglia dietro le barre, mai davanti */}
      {ticks.map((t) => (
        <line key={t} x1={x(t)} y1={TOP} x2={x(t)} y2={baseY} className={t === 0 ? "bar-axis" : "bar-grid"} />
      ))}
      {data.map((r, i) => {
        const y = TOP + i * ROW_H;
        const isSelected = r.key === selectedKey;
        const isDimmed = Boolean(selectedKey) && !isSelected;
        const w = Math.max(x(r.value) - plotL, 2);
        const body = (
          <>
            {/* Fascia invisibile: rende cliccabile e "passabile sopra" tutta la riga, non la sola barra */}
            <rect x={0} y={y} width={W} height={ROW_H} className="bar-hit" />
            <text x={plotL - 12} y={y + ROW_H / 2} className="bar-label" dominantBaseline="central" textAnchor="end">
              {r.label}
            </text>
            <rect x={plotL} y={y + (ROW_H - BAR_H) / 2} width={w} height={BAR_H} rx={2} className="bar-fill" />
            <text x={plotL + w + 10} y={y + ROW_H / 2} className="bar-value" dominantBaseline="central">
              {r.value}
            </text>
          </>
        );
        const cls = `bar-row${isDimmed ? " is-dim" : ""}${isSelected ? " is-selected" : ""}`;
        return r.href ? (
          <a key={r.key} href={r.href} className={cls} aria-label={r.aria ?? `${r.label}: ${r.value} ${unit}`.trim()} aria-current={isSelected ? "true" : undefined}>
            {body}
          </a>
        ) : (
          <g key={r.key} className={cls}>
            {body}
          </g>
        );
      })}
      {/* Asse dei valori sotto il grafico */}
      <line x1={plotL} y1={baseY} x2={plotR} y2={baseY} className="bar-axis" />
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={baseY + 16} className="bar-tick" textAnchor="middle">
          {t}
        </text>
      ))}
    </svg>
  );
}
