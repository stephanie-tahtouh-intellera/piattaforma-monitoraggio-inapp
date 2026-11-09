import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPercentIt } from "@/contracts/format";
import { garaKpiList } from "@/server/queries";
import { db, pageActor, sp } from "@/server/page";
import { Euro, StatusChip } from "@/ui/badges";
import { STATUS_LABEL } from "@/ui/labels";

export const metadata = { title: "KPI gare" };

/** KPI per gara e importi di gara (DEC-111, incremento 5): perimetro dell'utente, calcoli nel dominio. */
export default async function GareKpiPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await pageActor();
  if (actor.role === "SUPPLIER") redirect("/");
  const q = await searchParams;
  const f = { project: sp(q.project), status: sp(q.status) };
  const d = await db();
  const r = await garaKpiList(d, actor, f);
  const projects = (await d.prepare("SELECT code, name FROM projects ORDER BY code").all()) as { code: string; name: string }[];
  const filtered = Boolean(f.project || f.status);
  return (
    <>
      <nav className="breadcrumb" aria-label="Percorso">
        <Link href="/">Dashboard</Link> › <span aria-current="page">KPI gare</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>KPI per gara</h1>
          <div className="page-meta">
            Base di gara, importo aggiudicato, ribasso e programmato per ogni gara del tuo perimetro. Importi calcolati dal sistema; i valori con ≈ sono ricavati dal programmato.
          </div>
        </div>
      </div>
      <form className="filters" method="get" aria-label="Filtri dei KPI gare">
        {projects.length ? (
          <div className="field">
            <label htmlFor="k-project">Progetto</label>
            <select id="k-project" name="project" defaultValue={f.project ?? ""}>
              <option value="">Tutti</option>
              {projects.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
            </select>
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="k-status">Fase</label>
          <select id="k-status" name="status" defaultValue={f.status ?? ""}>
            <option value="">Tutte</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="actions">
          <button className="btn btn-secondary" type="submit">Applica</button>
          {filtered ? <Link href="/kpi-gare">Azzera filtri</Link> : null}
        </div>
      </form>
      <section aria-label="Totali" className="grid kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi-card"><div className="kpi-label">Gare</div><div className="kpi-value">{r.totals.count}</div><div className="kpi-sub">{r.totals.awardedCount} aggiudicate</div></div>
        <div className="kpi-card"><div className="kpi-label">Programmato</div><div className="kpi-value"><Euro v={r.totals.programmed} /></div><div className="kpi-sub">importo a disposizione delle strutture</div></div>
        <div className="kpi-card"><div className="kpi-label">Base di gara</div><div className="kpi-value"><Euro v={r.totals.base} /></div><div className="kpi-sub">IVA esclusa</div></div>
        <div className="kpi-card"><div className="kpi-label">Aggiudicato</div><div className="kpi-value"><Euro v={r.totals.awardedNet} /></div><div className="kpi-sub">IVA esclusa, gare aggiudicate</div></div>
        <div className="kpi-card"><div className="kpi-label">Ribasso medio</div><div className="kpi-value">{formatPercentIt(r.totals.ribasso)}</div><div className="kpi-sub">ponderato sulle gare aggiudicate</div></div>
      </section>
      <div className="table-wrap">
        <table className="data">
          <caption>KPI per gara: {r.totals.count} gare{filtered ? " (filtrate)" : ""}</caption>
          <thead>
            <tr>
              <th scope="col">Codice</th>
              <th scope="col">Oggetto</th>
              <th scope="col">Fase</th>
              <th scope="col" className="num">Base di gara</th>
              <th scope="col" className="num">Aggiudicato</th>
              <th scope="col" className="num">Ribasso</th>
              <th scope="col" className="num">Programmato</th>
            </tr>
          </thead>
          <tbody>
            {r.items.map((p) => (
              <tr key={p.code}>
                <td className="mono"><Link href={`/procedure/${p.code}`}>{p.code}</Link></td>
                <td className="title">
                  <span className="clamp2" title={p.title}>{p.title}</span>
                  {p.project ? <span className="small muted">{p.project.name}</span> : null}
                </td>
                <td><StatusChip value={p.status} /></td>
                <td className="num">{p.base ? <>{p.baseDerived ? <span title="Ricavata dal programmato (il workbook non riporta la base d'asta)">≈ </span> : null}<Euro v={p.base} /></> : "—"}</td>
                <td className="num">{p.awardedNet ? <Euro v={p.awardedNet} /> : "—"}</td>
                <td className="num">{p.ribasso !== null ? formatPercentIt(p.ribasso) : "—"}</td>
                <td className="num"><Euro v={p.programmed} /></td>
              </tr>
            ))}
            {!r.items.length ? <tr><td colSpan={7}>Nessuna gara nel tuo perimetro con questi filtri.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Ribasso = (base di gara − aggiudicato) / base di gara. Un valore negativo indica un aggiudicato superiore alla base. Il programmato comprende contratto IVA inclusa, tassa gara e incentivi secondo la configurazione della procedura; i valori storici restano invariati.
      </p>
    </>
  );
}
