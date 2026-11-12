import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPercentIt } from "@/contracts/format";
import { financialKpiByType, garaKpiList } from "@/server/queries";
import { db, pageActor, sp } from "@/server/page";
import { Euro, StatusChip } from "@/ui/badges";
import { HEALTH_LABEL, STATUS_LABEL, TYPE_LABEL } from "@/ui/labels";

export const metadata = { title: "KPI gare" };

/** KPI per gara e importi di gara (DEC-111, incremento 5): perimetro dell'utente, calcoli nel dominio. */
export default async function GareKpiPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await pageActor();
  if (actor.role === "SUPPLIER") redirect("/");
  const q = await searchParams;
  const f = { project: sp(q.project), status: sp(q.status), type: sp(q.type) };
  const d = await db();
  const r = await garaKpiList(d, actor, f);
  const fin = await financialKpiByType(d, actor, f);
  const projects = (await d.prepare("SELECT code, name FROM projects ORDER BY code").all()) as { code: string; name: string }[];
  const filtered = Boolean(f.project || f.status || f.type);
  return (
    <>
      <nav className="breadcrumb" aria-label="Percorso">
        <Link href="/">Dashboard</Link> › <span aria-current="page">KPI gare</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>KPI per gara</h1>
          <div className="page-meta">
            Base di gara, importo aggiudicato, ribasso e programmato per ogni gara del tuo perimetro. Importi calcolati dal sistema; i valori con ≈ sono ricavati dal programmato. Il ribasso è significativo solo per le gare competitive (negoziata, aperta, accordo quadro): nell'affidamento diretto, ODA/TD MePA e ordinativo/adesione Consip non c'è una base di gara concorrenziale.
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
        <div className="field">
          <label htmlFor="k-type">Tipo di gara</label>
          <select id="k-type" name="type" defaultValue={f.type ?? ""}>
            <option value="">Tutti</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
        <div className="kpi-card"><div className="kpi-label">Ribasso medio</div><div className="kpi-value">{formatPercentIt(r.totals.ribasso)}</div><div className="kpi-sub">ponderato su {r.totals.competitiveAwardedCount} gare competitive aggiudicate</div></div>
        <div className="kpi-card"><div className="kpi-label">Spesa su gara competitiva</div><div className="kpi-value">{r.totals.competitiveProgrammedShare !== null ? formatPercentIt(r.totals.competitiveProgrammedShare) : "—"}</div><div className="kpi-sub"><Euro v={r.totals.programmedCompetitive} /> su {r.totals.count} gare, negoziata/aperta/accordo quadro</div></div>
        <div className="kpi-card"><div className="kpi-label">Giorni indizione → aggiudicazione</div><div className="kpi-value">{r.totals.averageAwardDurationDays !== null ? r.totals.averageAwardDurationDays : "—"}</div><div className="kpi-sub">media sulle gare con entrambe le date registrate</div></div>
      </section>
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <table className="data">
          <caption>Per tipo di gara</caption>
          <thead>
            <tr>
              <th scope="col">Tipo</th>
              <th scope="col" className="num">Gare</th>
              <th scope="col" className="num">Aggiudicate</th>
              <th scope="col" className="num">Programmato</th>
              <th scope="col" className="num">Base di gara</th>
              <th scope="col" className="num">Aggiudicato</th>
              <th scope="col" className="num">Ribasso</th>
              <th scope="col" className="num">Giorni indizione → aggiudicazione</th>
            </tr>
          </thead>
          <tbody>
            {r.byType.map((t) => (
              <tr key={t.type}>
                <td>{TYPE_LABEL[t.type] ?? t.type}</td>
                <td className="num">{t.count}</td>
                <td className="num">{t.awardedCount}</td>
                <td className="num"><Euro v={t.programmed} /></td>
                <td className="num"><Euro v={t.base} /></td>
                <td className="num"><Euro v={t.awardedNet} /></td>
                <td className="num">
                  {t.competitive
                    ? t.ribasso !== null ? formatPercentIt(t.ribasso) : "—"
                    : <span title="Non applicabile: procedura senza base di gara competitiva (variante A)">—</span>}
                </td>
                <td className="num">{t.averageAwardDurationDays !== null ? t.averageAwardDurationDays : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                <td className="num">
                  {p.ribasso !== null
                    ? formatPercentIt(p.ribasso)
                    : !p.competitive
                      ? <span title="Non applicabile: procedura senza base di gara competitiva (variante A)">—</span>
                      : "—"}
                </td>
                <td className="num"><Euro v={p.programmed} /></td>
              </tr>
            ))}
            {!r.items.length ? <tr><td colSpan={7}>Nessuna gara nel tuo perimetro con questi filtri.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Ribasso = (base di gara − aggiudicato) / base di gara, solo per le gare competitive (negoziata, aperta, accordo quadro). Un valore negativo indica un aggiudicato superiore alla base. Nell'affidamento diretto, ODA/TD MePA e ordinativo/adesione Consip (variante A) non c'è una gara concorrenziale, quindi il ribasso non si applica. Il programmato comprende contratto IVA inclusa, tassa gara e incentivi secondo la configurazione della procedura; i valori storici restano invariati.
        «Spesa su gara competitiva» è la quota del programmato che passa da negoziata, aperta o accordo quadro, rispetto al totale. «Giorni indizione → aggiudicazione» è la distanza fra le date effettive di indizione e aggiudicazione registrate nell'iter della procedura; è nullo finché una delle due manca.
      </p>
      <h2 style={{ marginTop: 32 }}>KPI finanziari per tipo di gara</h2>
      <p className="page-meta">
        Programmato, contrattualizzato, pagato, residuo e importo a rischio per ciascun tipo di gara, con le procedure in ritardo e per livello di salute. Stesso perimetro e stessi filtri della sezione sopra.
      </p>
      <section aria-label="Totali finanziari" className="grid kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi-card"><div className="kpi-label">Programmato</div><div className="kpi-value"><Euro v={fin.totals.programmed} /></div><div className="kpi-sub">{fin.totals.count} procedure</div></div>
        <div className="kpi-card"><div className="kpi-label">Contrattualizzato</div><div className="kpi-value"><Euro v={fin.totals.contracted} /></div><div className="kpi-sub">importo dei contratti stipulati</div></div>
        <div className="kpi-card"><div className="kpi-label">Pagato</div><div className="kpi-value"><Euro v={fin.totals.paid} /></div><div className="kpi-sub">residuo <Euro v={fin.totals.residual} /></div></div>
        <div className="kpi-card"><div className="kpi-label">Importo a rischio</div><div className="kpi-value"><Euro v={fin.totals.atRisk} /></div><div className="kpi-sub">{fin.totals.late} in ritardo</div></div>
        <div className="kpi-card">
          <div className="kpi-label">Salute</div>
          <div className="kpi-value">{fin.totals.health.red + fin.totals.health.amber}</div>
          <div className="kpi-sub">su {fin.totals.count} da monitorare (rosso + ambra)</div>
          <div className="kpi-split"><span>{HEALTH_LABEL.RED} {fin.totals.health.red}</span><span>{HEALTH_LABEL.AMBER} {fin.totals.health.amber}</span><span>{HEALTH_LABEL.GREEN} {fin.totals.health.green}</span></div>
        </div>
      </section>
      <div className="table-wrap">
        <table className="data">
          <caption>KPI finanziari per tipo di gara</caption>
          <thead>
            <tr>
              <th scope="col">Tipo</th>
              <th scope="col" className="num">Procedure</th>
              <th scope="col" className="num">Programmato</th>
              <th scope="col" className="num">Contrattualizzato</th>
              <th scope="col" className="num">Pagato</th>
              <th scope="col" className="num">Residuo</th>
              <th scope="col" className="num">A rischio</th>
              <th scope="col" className="num">In ritardo</th>
              <th scope="col">Salute</th>
            </tr>
          </thead>
          <tbody>
            {fin.byType.map((t) => (
              <tr key={t.type}>
                <td>{TYPE_LABEL[t.type] ?? t.type}</td>
                <td className="num">{t.count}</td>
                <td className="num"><Euro v={t.programmed} /></td>
                <td className="num"><Euro v={t.contracted} /></td>
                <td className="num"><Euro v={t.paid} /></td>
                <td className="num"><Euro v={t.residual} /></td>
                <td className="num"><Euro v={t.atRisk} /></td>
                <td className="num">{t.late}</td>
                <td className="small muted">{t.health.red} {HEALTH_LABEL.RED} · {t.health.amber} {HEALTH_LABEL.AMBER} · {t.health.green} {HEALTH_LABEL.GREEN}</td>
              </tr>
            ))}
            {!fin.byType.length ? <tr><td colSpan={9}>Nessuna gara nel tuo perimetro con questi filtri.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Contrattualizzato = importo dei contratti già stipulati; residuo = contrattualizzato ancora da pagare. Importo a rischio = quota del programmato non coperta dalla disponibilità o in slittamento sull'anno corrente. In ritardo conta le procedure con milestone o SAL scaduti, secondo lo stesso criterio della dashboard.
      </p>
    </>
  );
}
