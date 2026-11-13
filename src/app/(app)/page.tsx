import { Info, OctagonAlert, Plus } from "lucide-react";
import Link from "next/link";
import { executionModuleEnabled } from "@/application/modules";
import { formatDateIt, formatDateTimeIt, formatEuro, formatEuroCompact, formatPercentIt } from "@/contracts/format";
import { dashboard, financialKpiByType, garaKpiList } from "@/server/queries";
import { db, pageActor, sp } from "@/server/page";
import { AnnualChart } from "@/ui/annual-chart";
import { AutoSubmitSelect } from "@/ui/auto-submit";
import { Deadline, Euro, HealthBadge, StatusChip } from "@/ui/badges";
import { KPI_HELP } from "@/ui/kpi-help";
import { HEALTH_LABEL, STATUS_LABEL, TYPE_LABEL } from "@/ui/labels";
import { TypeChart } from "@/ui/type-chart";

export const metadata = { title: "Dashboard" };

/** Ordine del processo: quello di STATUS_LABEL (Bozza … Chiusa, Annullata per ultima). */
const STATUS_ORDER = Object.keys(STATUS_LABEL);
const statusOrder = (s: string) => {
  const i = STATUS_ORDER.indexOf(s);
  return i === -1 ? STATUS_ORDER.length : i;
};

/**
 * Sezioni della dashboard (DEC-123): ognuna sta in una schermata, così non serve scorrere.
 * La sezione attiva è nell'indirizzo (`?tab=`), come nella scheda procedura; "panoramica"
 * è il default e non mette il parametro, per non cambiare l'indirizzo della home.
 */
const TABS = [
  ["panoramica", "Panoramica"],
  ["finanza", "Finanza"],
  ["affidamenti", "Affidamenti"],
  ["avanzamento", "Avanzamento"],
  ["attenzione", "Attenzione"],
] as const;
type TabKey = (typeof TABS)[number][0];

/** Card KPI: valore, unità/periodo e definizione al passaggio del mouse e al focus (07 §6.6). */
function Kpi({ label, value, sub, href, extra, aria, help }: { label: string; value: string | number; sub: string; href: string; extra?: React.ReactNode; aria: string; help?: string }) {
  return (
    // La definizione sta in `data-tip` e non nel DOM: il pannello e' generato in CSS, cosi' il
    // testo d'aiuto non entra nel contenuto testuale della card (che i test e2e cercano per
    // sottostringa) e non viene annunciato due volte, essendo gia' nell'aria-label.
    <Link className="kpi-card" href={href} aria-label={help ? `${aria}. ${help}` : aria} data-tip={help}>
      <div className="kpi-label">
        {label}
        {help ? <Info className="kpi-info" size={13} aria-hidden /> : null}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
      {extra}
    </Link>
  );
}

/** Pastiglia «i» accanto al titolo di un grafico, con la stessa descrizione su hover e focus. */
function InfoChip({ text }: { text: string }) {
  return (
    <span className="info-chip" tabIndex={0} role="note" aria-label={`Come si legge: ${text}`} data-tip={text}>
      <Info size={14} aria-hidden />
    </span>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await pageActor();
  const q = await searchParams;
  const structure = sp(q.structure);
  const type = sp(q.type);
  const database = await db();
  const filters = { ...(structure ? { structure } : {}), ...(type ? { type } : {}) };
  const data = await dashboard(database, actor, filters);
  const k = data.kpi;
  const module2 = await executionModuleEnabled(database);
  const signedCount = data.byStatus.filter((x) => ["EXECUTION", "CLOSING", "CLOSED"].includes(x.status)).reduce((t, x) => t + Number(x.n), 0);
  const ref = formatDateIt(data.referenceDate);
  const structures = (await database.prepare("SELECT DISTINCT s.code, s.name FROM structures s JOIN procedures p ON p.structure_code = s.code ORDER BY s.name").all()) as {
    code: string;
    name: string;
  }[];
  const canSeeGaraKpi = actor.role !== "SUPPLIER";
  const r = canSeeGaraKpi ? await garaKpiList(database, actor, filters) : null;
  const fin = canSeeGaraKpi ? await financialKpiByType(database, actor, filters) : null;
  const filtered = Boolean(structure || type);
  const visibleTabs = TABS.filter(([key]) => key !== "affidamenti" || r !== null);
  const tabParam = sp(q.tab);
  const tab: TabKey = (visibleTabs.some(([key]) => key === tabParam) ? tabParam : "panoramica") as TabKey;

  /** Link al portafoglio filtrato, conservando i filtri attivi della dashboard. */
  const qs = (extra: Record<string, string | undefined> = {}) => {
    const u = new URLSearchParams();
    if (type) u.set("type", type);
    if (structure) u.set("structure", structure);
    for (const [key, v] of Object.entries(extra)) if (v) u.set(key, v);
    return `/portafoglio?${u.toString()}`;
  };
  /** Link a una sezione della dashboard, conservando i filtri attivi. */
  const tabHref = (key: TabKey, keepFilters = true) => {
    const u = new URLSearchParams();
    if (keepFilters && type) u.set("type", type);
    if (keepFilters && structure) u.set("structure", structure);
    if (key !== "panoramica") u.set("tab", key);
    const s = u.toString();
    return s ? `/?${s}` : "/";
  };

  const riskKpi = (
    <Kpi
      label="Importo a rischio"
      value={formatEuroCompact(k.atRisk.total)}
      sub={formatEuro(k.atRisk.total)}
      href={qs({ sort: "risk", dir: "desc" })}
      aria={`Importo a rischio ${formatEuro(k.atRisk.total)}: non coperto ${formatEuro(k.atRisk.uncovered)}, in slittamento ${formatEuro(k.atRisk.slipping)}`}
      help={KPI_HELP.atRisk}
      extra={<div className="kpi-split"><span>Non coperto {formatEuro(k.atRisk.uncovered)}</span><span>In slittamento {formatEuro(k.atRisk.slipping)}</span></div>}
    />
  );
  const paidOrSignedKpi = module2 ? (
    <Kpi label="Pagato" value={formatEuroCompact(fin ? fin.totals.paid : k.paid)} sub={fin ? `residuo ${formatEuro(fin.totals.residual)}` : formatEuro(k.paid)} href={qs({ status: "EXECUTION,CLOSING,CLOSED" })} aria={`Pagato ${formatEuro(fin ? fin.totals.paid : k.paid)}`} help={KPI_HELP.paid} />
  ) : (
    <Kpi label="Contratti stipulati" value={signedCount} sub="procedure con Modulo 1 completato" href={qs({ status: "EXECUTION,CLOSING,CLOSED" })} aria={`Contratti stipulati: ${signedCount}`} help={KPI_HELP.signedCount} />
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard direzionale</h1>
          <div className="page-meta">
            Data di riferimento {ref} · Ultimo aggiornamento {formatDateTimeIt(data.updatedAt)}
          </div>
        </div>
        <div className="actions head-actions">
          <form className="filters" method="get">
            {tab === "panoramica" ? null : <input type="hidden" name="tab" value={tab} />}
            <div className="field">
              <label htmlFor="type">Tipo di procedura</label>
              <AutoSubmitSelect id="type" name="type" defaultValue={type ?? ""}>
                <option value="">Tutti</option>
                {Object.entries(TYPE_LABEL).map(([tk, tv]) => (
                  <option key={tk} value={tk}>
                    {tv}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
            <div className="field">
              <label htmlFor="structure">Struttura</label>
              <AutoSubmitSelect id="structure" name="structure" defaultValue={structure ?? ""}>
                <option value="">Tutte le strutture</option>
                {structures.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
            {filtered ? (
              <Link className="btn btn-secondary btn-sm" href={tabHref(tab, false)}>
                Azzera filtri
              </Link>
            ) : null}
          </form>
          {actor.role === "STRUCTURE_USER" || actor.role === "ADMIN" ? (
            <Link className="btn btn-primary" href="/procedure/nuova">
              <Plus aria-hidden /> Nuova memoria
            </Link>
          ) : null}
        </div>
      </div>

      <nav className="tabs" aria-label="Sezioni della dashboard">
        {visibleTabs.map(([key, label]) => (
          <Link key={key} href={tabHref(key)} aria-current={tab === key ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>

      {tab === "panoramica" ? (
        <section aria-labelledby="h-panoramica">
          <h2 id="h-panoramica">Stato del portafoglio</h2>
          <p className="page-meta">Come stanno le procedure del perimetro filtrato alla data di riferimento. Passa sopra una card per la definizione dell&apos;indicatore.</p>
          <div className="grid kpi-grid" style={{ marginTop: 12 }}>
            <Kpi label="Procedure monitorate" value={k.proceduresTotal} sub={`al ${ref}`} href={qs()} aria={`Procedure monitorate: ${k.proceduresTotal}. Apri il portafoglio`} help={KPI_HELP.proceduresTotal} extra={<div className="kpi-split"><span>{HEALTH_LABEL.RED} {k.health.RED}</span><span>{HEALTH_LABEL.AMBER} {k.health.AMBER}</span><span>{HEALTH_LABEL.GREEN} {k.health.GREEN}</span></div>} />
            <Kpi label="In ritardo" value={k.proceduresLate} sub={`su ${k.proceduresTotal} · ${module2 ? "milestone o SAL scaduti" : "passi scaduti"}`} href={qs({ health: "RED" })} aria={`Procedure in ritardo: ${k.proceduresLate} su ${k.proceduresTotal}`} help={KPI_HELP.proceduresLate} />
            <Kpi label="Da riprogrammare" value={k.toReschedule} sub="milestone bloccante oltre T+1" href={qs({ reschedule: "1" })} aria={`Procedure da riprogrammare: ${k.toReschedule}`} help={KPI_HELP.toReschedule} />
            <Kpi label="Alert critici" value={k.criticalAlerts} sub={`aperti al ${ref}`} href="/alert?view=critical" aria={`Alert critici: ${k.criticalAlerts}`} help={KPI_HELP.criticalAlerts} extra={k.criticalAlerts ? <div className="kpi-sub" style={{ color: "var(--health-red-fg)" }}><OctagonAlert size={14} aria-hidden /> da prendere in carico</div> : null} />
            <Kpi label="Procedure attive" value={k.proceduresActive} sub="non in bozza, chiuse o annullate" href={qs()} aria={`Procedure attive: ${k.proceduresActive}`} help={KPI_HELP.proceduresActive} />
            <Kpi label="Procedure da avviare" value={k.proceduresToStart} sub="ancora in bozza" href={qs({ status: "DRAFT" })} aria={`Procedure da avviare: ${k.proceduresToStart}`} help={KPI_HELP.proceduresToStart} />
            <Kpi label="Richieste di riprogrammazione" value={k.reprogramRequests} sub="versioni approvate oltre la baseline" href={qs()} aria={`Richieste di riprogrammazione: ${k.reprogramRequests}`} help={KPI_HELP.reprogramRequests} />
            {riskKpi}
          </div>
        </section>
      ) : null}

      {tab === "finanza" ? (
        <section aria-labelledby="h-finanza">
          <h2 id="h-finanza">Quadro finanziario</h2>
          <p className="page-meta">Importi IVA inclusa salvo indicazione contraria, sullo stesso perimetro filtrato.</p>
          <div className="grid kpi-grid" style={{ marginTop: 12 }}>
            <Kpi label="Programmato" value={formatEuroCompact(fin ? fin.totals.programmed : k.programmed)} sub={`${formatEuro(fin ? fin.totals.programmed : k.programmed)} · escluse le annullate`} href={qs({ sort: "programmed", dir: "desc" })} aria={`Programmato ${formatEuro(fin ? fin.totals.programmed : k.programmed)}`} help={KPI_HELP.programmed} />
            {r ? <Kpi label="Base di gara" value={formatEuroCompact(r.totals.base)} sub={`${formatEuro(r.totals.base)} · IVA esclusa`} href={qs()} aria={`Base di gara ${formatEuro(r.totals.base)}`} help={KPI_HELP.base} /> : null}
            <Kpi label="Contrattualizzato" value={formatEuroCompact(fin ? fin.totals.contracted : k.contracted)} sub={`${formatEuro(fin ? fin.totals.contracted : k.contracted)} · contratti stipulati`} href={qs({ status: "EXECUTION,CLOSING,CLOSED" })} aria={`Contrattualizzato ${formatEuro(fin ? fin.totals.contracted : k.contracted)}`} help={KPI_HELP.contracted} />
            {r ? <Kpi label="Aggiudicato" value={formatEuroCompact(r.totals.awardedNet)} sub={`${formatEuro(r.totals.awardedNet)} · IVA esclusa`} href={qs()} aria={`Aggiudicato ${formatEuro(r.totals.awardedNet)}`} help={KPI_HELP.awardedNet} /> : null}
            {paidOrSignedKpi}
            {riskKpi}
          </div>
          <div className="card" style={{ marginTop: 16, maxWidth: 600 }}>
            <div className="card-head">
              <h3>Fabbisogno per annualità</h3>
              <InfoChip text={KPI_HELP.annual} />
            </div>
            <AnnualChart rows={data.annual} />
          </div>
        </section>
      ) : null}

      {tab === "affidamenti" && r ? (
        <section aria-labelledby="h-affidamenti">
          <h2 id="h-affidamenti">Tipologie e andamento degli affidamenti</h2>
          <p className="page-meta">Come si distribuiscono le procedure per tipologia e come vanno le gare competitive.</p>
          <div className="grid kpi-grid" style={{ marginTop: 12 }}>
            <Kpi label="Procedure aggiudicate" value={r.totals.awardedCount} sub={`su ${r.totals.count} nel tuo perimetro`} href={qs()} aria={`Procedure aggiudicate: ${r.totals.awardedCount} su ${r.totals.count}`} help={KPI_HELP.awardedCount} />
            <Kpi label="Ribasso medio" value={formatPercentIt(r.totals.ribasso)} sub={`su ${r.totals.competitiveAwardedCount} gare competitive aggiudicate`} href={qs()} aria={`Ribasso medio ${formatPercentIt(r.totals.ribasso)}`} help={KPI_HELP.ribasso} />
            <Kpi label="Spesa su gara competitiva" value={r.totals.competitiveProgrammedShare !== null ? formatPercentIt(r.totals.competitiveProgrammedShare) : "n.d."} sub="negoziata, aperta, accordo quadro" href={qs()} aria={`Spesa su gara competitiva: ${r.totals.competitiveProgrammedShare !== null ? formatPercentIt(r.totals.competitiveProgrammedShare) : "non disponibile"}`} help={KPI_HELP.competitiveShare} />
            <Kpi label="Giorni indizione → aggiudicazione" value={r.totals.averageAwardDurationDays !== null ? r.totals.averageAwardDurationDays : "n.d."} sub="media sulle procedure con entrambe le date" href={qs()} aria={`Giorni indizione aggiudicazione: ${r.totals.averageAwardDurationDays ?? "non disponibile"}`} help={KPI_HELP.awardDuration} />
          </div>
          <div className="card" style={{ marginTop: 16, maxWidth: 680 }}>
            <div className="card-head">
              <h3>Procedure per tipo</h3>
              <InfoChip text={KPI_HELP.byType} />
            </div>
            <TypeChart rows={data.byType} linkFor={(t) => qs({ type: t })} selectedType={type} />
          </div>
        </section>
      ) : null}

      {tab === "avanzamento" ? (
        <section aria-labelledby="h-avanzamento">
          <h2 id="h-avanzamento">Avanzamento nel processo</h2>
          <p className="page-meta">Quante procedure si trovano in ciascuna fase, dalla bozza alla chiusura. Apri una fase per vederne l&apos;elenco.</p>
          <div className="grid kpi-grid" style={{ marginTop: 12 }}>
            {[...data.byStatus].sort((a, b) => statusOrder(a.status) - statusOrder(b.status)).map((s) => (
              <Kpi
                key={s.status}
                label={STATUS_LABEL[s.status] ?? s.status}
                value={s.n}
                sub="procedure in questa fase"
                href={qs({ status: s.status })}
                aria={`${STATUS_LABEL[s.status] ?? s.status}: ${s.n} procedure`}
                help={KPI_HELP.byStatus}
              />
            ))}
          </div>
        </section>
      ) : null}

      {tab === "attenzione" ? (
        <section aria-labelledby="h-attenzione">
          <div className="page-head" style={{ marginBottom: 8 }}>
            <div>
              <h2 id="h-attenzione">Richiede attenzione</h2>
              <p className="page-meta">{KPI_HELP.attention}</p>
            </div>
            <div className="actions">
              <Link className="btn btn-secondary btn-sm" href={qs({ health: "RED" })}>
                Vedi le rosse
              </Link>
              <Link className="btn btn-secondary btn-sm" href={qs({ health: "AMBER" })}>
                Vedi le gialle
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <caption className="sr-only">Procedure rosse e gialle ordinate per severità</caption>
                <thead>
                  <tr>
                    <th scope="col">Codice</th>
                    <th scope="col">Oggetto</th>
                    <th scope="col">Fase</th>
                    <th scope="col">Health</th>
                    <th scope="col">Prossima scadenza</th>
                    <th scope="col" className="num">Programmato</th>
                    <th scope="col" className="num">A rischio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attention.map((p) => (
                    <tr key={p.code}>
                      <td className="mono">
                        <Link href={`/procedure/${p.code}`}>{p.code}</Link>
                      </td>
                      <td className="title">
                        <span className="clamp2" title={p.title}>{p.title}</span>
                        <ul className="drivers">{p.healthDrivers.slice(0, 2).map((d: { message: string }, i: number) => <li key={i}>{d.message}</li>)}</ul>
                      </td>
                      <td><StatusChip value={p.status} /></td>
                      <td><HealthBadge value={p.health} drivers={p.healthDrivers} /></td>
                      <td><Deadline d={p.nextDeadline} /></td>
                      <td className="num"><Euro v={p.programmed} /></td>
                      <td className="num"><Euro v={p.atRisk} /></td>
                    </tr>
                  ))}
                  {data.attention.length === 0 ? (
                    <tr><td colSpan={7} className="muted">Nessuna procedura richiede attenzione.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
