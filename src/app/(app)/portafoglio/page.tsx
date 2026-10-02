import Link from "next/link";
import { listProcedures, type PortfolioFilters } from "@/server/queries";
import { can } from "@/server/authz";
import { db, pageActor, sp } from "@/server/page";
import { Deadline, Euro, HealthBadge, StatusChip } from "@/ui/badges";
import { HEALTH_LABEL, STATUS_LABEL, TYPE_LABEL, OWNER_LABEL } from "@/ui/labels";

export const metadata = { title: "Portafoglio" };

const COLS: [string, string, boolean][] = [
  ["code", "Codice", false],
  ["title", "Oggetto", false],
  ["status", "Fase", false],
  ["health", "Health", false],
  ["deadline", "Prossima scadenza", false],
  ["programmed", "Programmato", true],
  ["risk", "A rischio", true],
];

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await pageActor();
  const q = await searchParams;
  const f: PortfolioFilters = {
    q: sp(q.q), health: sp(q.health), status: sp(q.status), structure: sp(q.structure), type: sp(q.type), year: sp(q.year),
    reschedule: sp(q.reschedule), alerts: sp(q.alerts), sort: sp(q.sort) ?? "health", dir: sp(q.dir) ?? "asc",
    page: Number(sp(q.page) ?? "1"), size: Number(sp(q.size) ?? "25"),
  };
  const d = db();
  const r = listProcedures(d, actor, f);
  const structures = d.prepare("SELECT DISTINCT s.code, s.name FROM structures s JOIN procedures p ON p.structure_code = s.code ORDER BY s.name").all() as { code: string; name: string }[];
  const years = (d.prepare("SELECT DISTINCT year FROM procedure_snapshot_year ORDER BY year").all() as { year: number }[]).map((x) => x.year);
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...patch })) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) u.set(k, String(v));
    return `/portafoglio?${u.toString()}`;
  };
  const active = (["health", "status", "structure", "type", "year", "reschedule", "alerts", "q"] as const).filter((k) => f[k]);
  const from = r.total ? (r.page - 1) * r.size + 1 : 0;
  const to = Math.min(r.page * r.size, r.total);
  return (
    <>
      <nav className="breadcrumb" aria-label="Percorso">
        <Link href="/">Dashboard</Link> › <span aria-current="page">Portafoglio</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>Portafoglio procedure</h1>
          <div className="page-meta">Filtri e ordinamento lato server; lo stato dei filtri è nell'indirizzo della pagina.</div>
        </div>
        {can(actor, "export") || actor.role === "STRUCTURE_USER" ? (
          <div className="actions">
            {actor.role === "STRUCTURE_USER" || actor.role === "ADMIN" ? <Link className="btn btn-primary" href="/procedure/nuova">Nuova procedura in bozza</Link> : null}
            <a className="btn btn-secondary" href={`/api/exports/portfolio.csv?${qs({}).split("?")[1]}`}>Esporta CSV ({r.total} righe)</a>
            <a className="btn btn-secondary" href={`/api/exports/portfolio.xlsx?${qs({}).split("?")[1]}`}>Esporta XLSX</a>
          </div>
        ) : null}
      </div>
      <form className="filters" method="get" aria-label="Filtri del portafoglio">
        <div className="field">
          <label htmlFor="f-q">Ricerca</label>
          <input id="f-q" name="q" type="search" defaultValue={f.q ?? ""} placeholder="Codice, oggetto, CIG" />
        </div>
        <div className="field">
          <label htmlFor="f-health">Health</label>
          <select id="f-health" name="health" defaultValue={f.health ?? ""}>
            <option value="">Tutti</option>
            {Object.entries(HEALTH_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="RED,AMBER">Rosso o ambra</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-status">Fase</label>
          <select id="f-status" name="status" defaultValue={f.status ?? ""}>
            <option value="">Tutte</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {structures.length > 1 ? (
          <div className="field">
            <label htmlFor="f-structure">Struttura</label>
            <select id="f-structure" name="structure" defaultValue={f.structure ?? ""}>
              <option value="">Tutte</option>
              {structures.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="f-type">Tipologia</label>
          <select id="f-type" name="type" defaultValue={f.type ?? ""}>
            <option value="">Tutte</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-year">Annualità</label>
          <select id="f-year" name="year" defaultValue={f.year ?? ""}>
            <option value="">Tutte</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-alerts">Alert</label>
          <select id="f-alerts" name="alerts" defaultValue={f.alerts ?? ""}>
            <option value="">Indifferente</option>
            <option value="open">Con alert aperti</option>
            <option value="critical">Con alert critici</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-res">Riprogrammazione</label>
          <select id="f-res" name="reschedule" defaultValue={f.reschedule ?? ""}>
            <option value="">Indifferente</option>
            <option value="1">Richiesta</option>
          </select>
        </div>
        <input type="hidden" name="sort" value={f.sort} />
        <input type="hidden" name="dir" value={f.dir} />
        <button className="btn btn-primary" type="submit">Applica filtri</button>
        {active.length ? <Link href="/portafoglio">Azzera filtri</Link> : null}
      </form>
      {active.length ? (
        <div className="actions" style={{ marginBottom: 12 }}>
          {active.map((k) => (
            <Link key={k} className="chip chip-filter" href={qs({ [k]: undefined, page: undefined })} aria-label={`Rimuovi filtro ${k}: ${f[k]}`}>
              {k}: {String(f[k])} ×
            </Link>
          ))}
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">{r.total} procedure trovate</p>
      <div className="table-wrap">
        <table className="data">
          <caption>
            Portafoglio: {r.total} procedure{active.length ? " (filtrate)" : ""}
          </caption>
          <thead>
            <tr>
              {COLS.map(([key, labelText, num]) => {
                const sorted = f.sort === key;
                const nextDir = sorted && f.dir === "asc" ? "desc" : "asc";
                return (
                  <th key={key} scope="col" className={num ? "num" : undefined} aria-sort={sorted ? (f.dir === "asc" ? "ascending" : "descending") : "none"}>
                    <Link href={qs({ sort: key, dir: nextDir, page: undefined })}>
                      {labelText} {sorted ? (f.dir === "asc" ? "▲" : "▼") : ""}
                    </Link>
                  </th>
                );
              })}
              <th scope="col">Owner</th>
            </tr>
          </thead>
          <tbody>
            {r.items.map((p) => (
              <tr key={p.code}>
                <td className="mono"><Link href={`/procedure/${p.code}`}>{p.code}</Link></td>
                <td className="title">
                  <span className="clamp2" title={p.title}>{p.title}</span>
                  <span className="small muted">{TYPE_LABEL[p.type] ?? p.type} · {p.operation ?? p.structure}</span>
                </td>
                <td><StatusChip value={p.status} /></td>
                <td><HealthBadge value={p.health} drivers={p.healthDrivers} />{p.rescheduleRequired ? <div className="small" style={{ color: "var(--health-red-fg)" }}>Riprogrammazione richiesta</div> : null}</td>
                <td><Deadline d={p.nextDeadline} /></td>
                <td className="num"><Euro v={p.programmed} /></td>
                <td className="num"><Euro v={p.atRisk} /></td>
                <td>{p.owner ? OWNER_LABEL[p.owner] ?? p.owner : "—"}</td>
              </tr>
            ))}
            {r.items.length === 0 ? (
              <tr><td colSpan={8} className="muted">Nessuna procedura corrisponde ai filtri. <Link href="/portafoglio">Azzera filtri</Link></td></tr>
            ) : null}
          </tbody>
        </table>
        <div className="pager">
          <span>{from}–{to} di {r.total}</span>
          <span className="actions">
            {r.page > 1 ? <Link className="btn btn-ghost btn-sm" href={qs({ page: String(r.page - 1) })} aria-label="Pagina precedente">‹ Precedente</Link> : null}
            {to < r.total ? <Link className="btn btn-ghost btn-sm" href={qs({ page: String(r.page + 1) })} aria-label="Pagina successiva">Successiva ›</Link> : null}
          </span>
        </div>
      </div>
    </>
  );
}
