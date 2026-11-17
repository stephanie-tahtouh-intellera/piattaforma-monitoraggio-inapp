import { ticksTo } from "@/ui/chart-scale";

export interface PhaseRow {
  status: string;
  label: string;
  n: number;
  late: number;
  href: string;
}

const W = 1040;
const H = 300;
const PAD = { l: 44, r: 12, t: 22, b: 76 };
const LINE_H = 13;

/** Spezza l'etichetta in righe che stiano nello spazio della colonna. */
function wrap(label: string, maxChars: number) {
  const out: string[] = [];
  let line = "";
  for (const word of label.split(" ")) {
    if (line && (line + " " + word).length > maxChars) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  return out.slice(0, 3);
}

/**
 * Avanzamento nel processo (DEC-129). Colonne da sinistra a destra, non barre
 * orizzontali: la sequenza delle fasi è un fatto temporale, e l'unica direzione che si
 * legge come tempo è quella orizzontale. Sotto l'asse una freccia lo dice a parole,
 * perché la posizione da sola non basta a chi guarda la pagina per la prima volta.
 *
 * Ogni colonna è impilata: in basso, in rosso, le procedure di quella fase che hanno
 * una scadenza già passata. Il rosso è il colore di stato dell'health, usato qui per
 * il suo significato; la legenda e la tabella sotto lo dicono anche a parole, perché il
 * colore da solo non può portare un'informazione.
 */
export function PhaseChart({ rows, aria }: { rows: PhaseRow[]; aria: string }) {
  const data = rows.filter((r) => r.n > 0);
  if (data.length === 0) return <p className="muted">Nessuna procedura nel perimetro filtrato.</p>;

  const { ticks, hi } = ticksTo(Math.max(...data.map((r) => r.n)), 4);
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const baseY = PAD.t + plotH;
  const slot = plotW / data.length;
  const bw = Math.min(64, slot - 22);
  const y = (v: number) => baseY - (v / hi) * plotH;
  const maxChars = Math.max(8, Math.floor(slot / 6.2));

  return (
    // Niente role="img": le colonne sono link, e un contenitore dichiarato immagine
    // vieterebbe elementi focalizzabili al suo interno (axe: nested-interactive).
    <svg className="phase-chart" viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} aria-label={aria}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className={t === 0 ? "ph-axis" : "ph-grid"} />
          <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="ph-tick">
            {t}
          </text>
        </g>
      ))}
      {data.map((r, i) => {
        const cx = PAD.l + i * slot + slot / 2;
        const x0 = cx - bw / 2;
        const hTot = baseY - y(r.n);
        const hLate = baseY - y(r.late);
        const lines = wrap(r.label, maxChars);
        return (
          <a key={r.status} href={r.href} className="ph-col" aria-label={`${r.label}: ${r.n} procedure${r.late ? `, di cui ${r.late} in ritardo` : ""}. Apri il portafoglio filtrato`}>
            <rect x={PAD.l + i * slot} y={PAD.t} width={slot} height={plotH + 4} className="ph-hit" />
            {/* In cima il totale della fase, sotto la quota in ritardo: due rettangoli
                impilati, non sovrapposti, così le altezze si sommano davvero. */}
            <rect x={x0} y={y(r.n)} width={bw} height={Math.max(hTot - hLate, 0)} rx={2} className="ph-fill" />
            {r.late > 0 ? <rect x={x0} y={y(r.late)} width={bw} height={hLate} className="ph-late" /> : null}
            <text x={cx} y={y(r.n) - 7} textAnchor="middle" className="ph-value">
              {r.n}
            </text>
            {lines.map((line, k) => (
              <text key={line} x={cx} y={baseY + 18 + k * LINE_H} textAnchor="middle" className="ph-label">
                {line}
              </text>
            ))}
          </a>
        );
      })}
      {/* La freccia dichiara che l'asse è il tempo, non un semplice elenco di categorie */}
      <defs>
        <marker id="ph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" className="ph-arrowhead" />
        </marker>
      </defs>
      <line x1={PAD.l} y1={H - 12} x2={W - PAD.r - 2} y2={H - 12} className="ph-arrow" markerEnd="url(#ph-arrow)" />
      <text x={PAD.l} y={H - 18} className="ph-arrow-label">
        avanzamento nel tempo
      </text>
    </svg>
  );
}
