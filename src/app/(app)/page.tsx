import { OctagonAlert, Plus } from "lucide-react";
import Link from "next/link";
import { executionModuleEnabled } from "@/application/modules";
import { formatDateIt, formatDateTimeIt, formatEuro, formatEuroCompact, formatPercentIt } from "@/contracts/format";
import { dashboard, financialKpiByType, garaKpiList } from "@/server/queries";
import { db, pageActor, sp } from "@/server/page";
import { AnnualChart } from "@/ui/annual-chart";
import { AutoSubmitSelect } from "@/ui/auto-submit";
import { Deadline, Euro, HealthBadge, StatusChip } from "@/ui/badges";
import { HEALTH_LABEL, STATUS_LABEL, TYPE_LABEL } from "@/ui/labels";
import { TypeChart } from "@/ui/type-chart";

export const metadata = { title: "Dashboard" };

/** Ordine del processo: quello di STATUS_LABEL (Bozza … Chiusa, Annullata per ultima). */
const STATUS_ORDER = Object.keys(STATUS_LABEL);
const statusOrder = (s: string) => {
  const i = STATUS_ORDER.indexOf(s);
  return i === -1 ? STATUS_ORDER.length : i;
};

function Kpi({ label, value, sub, href, extra, aria }: { label: string; value: string | number; sub: string; href: string; extra?: React.ReactNode; aria: string }) {
  return (
    <Link className="kpi-card" href={href} aria-label={aria}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
      {extra}
    </Link>
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
  const qs = (extra: Record<string, string | undefined> = {}) => {
    const u = new URLSearchParams();
    if (type) u.set("type", type);
    if (structure) u.set("structure", structure);
    for (const [key, v] of Object.entries(extra)) if (v) u.set(key, v);
    return `/portafoglio?${u.toString()}`;
  };
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
            <div className="field">
              <label htmlFor="type">Tipo di gara</label>
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
              <Link className="btn btn-secondary btn-sm" href="/">
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

      <h2>Panoramica procedure</h2>
      <section aria-label="Panoramica procedure" className="grid kpi-grid">
        <Kpi label="Procedure attive" value={k.proceduresActive} sub="non in bozza, chiuse o annullate" href={qs()} aria={`Procedure attive: ${k.proceduresActive}`} />
        <Kpi label="Procedure da avviare" value={k.proceduresToStart} sub="ancora in bozza" href={qs({ status: "DRAFT" })} aria={`Procedure da avviare: ${k.proceduresToStart}`} />
        <Kpi label="Richieste di riprogrammazione" value={k.reprogramRequests} sub="versioni approvate oltre la baseline" href={qs()} aria={`Richieste di riprogrammazione: ${k.reprogramRequests}`} />
      </section>
      <section className="card" aria-labelledby="bytype" style={{ marginTop: 16, marginBottom: 16, maxWidth: 680 }}>
        <h2 id="bytype">Procedure per tipo</h2>
        <TypeChart rows={data.byType} linkFor={(type) => qs({ type })} selectedType={type} />
      </section>

      <section aria-label="Indicatori principali" className="grid kpi-grid">
        <Kpi label="Procedure monitorate" value={k.proceduresTotal} sub={`al ${ref}`} href={qs()} aria={`Procedure monitorate: ${k.proceduresTotal}. Apri il portafoglio`} extra={<div className="kpi-split"><span>{HEALTH_LABEL.RED} {k.health.RED}</span><span>{HEALTH_LABEL.AMBER} {k.health.AMBER}</span><span>{HEALTH_LABEL.GREEN} {k.health.GREEN}</span></div>} />
        <Kpi label="In ritardo" value={k.proceduresLate} sub={`su ${k.proceduresTotal} · ${module2 ? "milestone o SAL scaduti" : "passi scaduti"}`} href={qs({ health: "RED" })} aria={`Procedure in ritardo: ${k.proceduresLate} su ${k.proceduresTotal}`} />
        <Kpi label="Da riprogrammare" value={k.toReschedule} sub="milestone bloccante oltre T+1" href={qs({ reschedule: "1" })} aria={`Procedure da riprogrammare: ${k.toReschedule}`} />
        <Kpi label="Alert critici" value={k.criticalAlerts} sub={`aperti al ${ref}`} href="/alert?view=critical" aria={`Alert critici: ${k.criticalAlerts}`} extra={k.criticalAlerts ? <div className="kpi-sub" style={{ color: "var(--health-red-fg)" }}><OctagonAlert size={14} aria-hidden /> da prendere in carico</div> : null} />
        {r ? (
          <>
            <Kpi label="Procedure aggiudicate" value={r.totals.awardedCount} sub={`su ${r.totals.count} nel tuo perimetro`} href={qs()} aria={`Procedure aggiudicate: ${r.totals.awardedCount} su ${r.totals.count}`} />
            <Kpi label="Ribasso medio" value={formatPercentIt(r.totals.ribasso)} sub={`ponderato su ${r.totals.competitiveAwardedCount} gare competitive aggiudicate`} href={qs()} aria={`Ribasso medio ${formatPercentIt(r.totals.ribasso)}`} />
            <Kpi label="Spesa su gara competitiva" value={r.totals.competitiveProgrammedShare !== null ? formatPercentIt(r.totals.competitiveProgrammedShare) : "—"} sub="negoziata, aperta, accordo quadro" href={qs()} aria={`Spesa su gara competitiva: ${r.totals.competitiveProgrammedShare !== null ? formatPercentIt(r.totals.competitiveProgrammedShare) : "non disponibile"}`} />
            <Kpi label="Giorni indizione → aggiudicazione" value={r.totals.averageAwardDurationDays !== null ? r.totals.averageAwardDurationDays : "—"} sub="media sulle procedure con entrambe le date" href={qs()} aria={`Giorni indizione aggiudicazione: ${r.totals.averageAwardDurationDays ?? "non disponibile"}`} />
          </>
        ) : null}
      </section>

      {fin && r ? (
        <>
          <h2 style={{ marginTop: 32 }}>KPI finanziari</h2>
          <p className="page-meta">Stesso perimetro e filtri della sezione sopra; importi IVA inclusa salvo indicazione contraria.</p>
          <section aria-label="KPI finanziari" className="grid kpi-grid">
            <Kpi label="Programmato" value={formatEuroCompact(fin.totals.programmed)} sub={`${formatEuro(fin.totals.programmed)} · escluse le annullate`} href={qs({ sort: "programmed", dir: "desc" })} aria={`Programmato ${formatEuro(fin.totals.programmed)}`} />
            <Kpi label="Base di gara" value={formatEuroCompact(r.totals.base)} sub={`${formatEuro(r.totals.base)} · IVA esclusa`} href={qs()} aria={`Base di gara ${formatEuro(r.totals.base)}`} />
            <Kpi label="Contrattualizzato" value={formatEuroCompact(fin.totals.contracted)} sub={`${formatEuro(fin.totals.contracted)} · contratti stipulati`} href={qs({ status: "EXECUTION,CLOSING,CLOSED" })} aria={`Contrattualizzato ${formatEuro(fin.totals.contracted)}`} />
            <Kpi label="Aggiudicato" value={formatEuroCompact(r.totals.awardedNet)} sub={`${formatEuro(r.totals.awardedNet)} · IVA esclusa`} href={qs()} aria={`Aggiudicato ${formatEuro(r.totals.awardedNet)}`} />
            {module2 ? <Kpi label="Pagato" value={formatEuroCompact(fin.totals.paid)} sub={`residuo ${formatEuro(fin.totals.residual)}`} href={qs({ status: "EXECUTION,CLOSING,CLOSED" })} aria={`Pagato ${formatEuro(fin.totals.paid)}`} /> : <Kpi label="Contratti stipulati" value={signedCount} sub="procedure con Modulo 1 completato" href={qs({ status: "EXECUTION,CLOSING,CLOSED" })} aria={`Contratti stipulati: ${signedCount}`} />}
            <Kpi
              label="Importo a rischio"
              value={formatEuroCompact(k.atRisk.total)}
              sub={formatEuro(k.atRisk.total)}
              href={qs({ sort: "risk", dir: "desc" })}
              aria={`Importo a rischio ${formatEuro(k.atRisk.total)}: non coperto ${formatEuro(k.atRisk.uncovered)}, in slittamento ${formatEuro(k.atRisk.slipping)}`}
              extra={<div className="kpi-split"><span title="Fabbisogno oltre la disponibilità sulla previsione approvata">Non coperto {formatEuro(k.atRisk.uncovered)}</span><span title="Previsione dell'anno corrente su procedure da riprogrammare">In slittamento {formatEuro(k.atRisk.slipping)}</span></div>}
            />
          </section>
        </>
      ) : (
        <section aria-label="Indicatori finanziari" className="grid kpi-grid" style={{ marginTop: 16 }}>
          <Kpi label="Programmato" value={formatEuroCompact(k.programmed)} sub={`${formatEuro(k.programmed)} · escluse le annullate`} href={qs({ sort: "programmed", dir: "desc" })} aria={`Programmato ${formatEuro(k.programmed)}`} />
          <Kpi label="Contrattualizzato" value={formatEuroCompact(k.contracted)} sub={`${formatEuro(k.contracted)} · contratti stipulati`} href={qs({ status: "EXECUTION,CLOSING,CLOSED" })} aria={`Contrattualizzato ${formatEuro(k.contracted)}`} />
          {module2 ? <Kpi label="Pagato" value={formatEuroCompact(k.paid)} sub={formatEuro(k.paid)} href={qs({ status: "EXECUTION,CLOSING,CLOSED" })} aria={`Pagato ${formatEuro(k.paid)}`} /> : <Kpi label="Contratti stipulati" value={signedCount} sub="procedure con Modulo 1 completato" href={qs({ status: "EXECUTION,CLOSING,CLOSED" })} aria={`Contratti stipulati: ${signedCount}`} />}
          <Kpi
            label="Importo a rischio"
            value={formatEuroCompact(k.atRisk.total)}
            sub={formatEuro(k.atRisk.total)}
            href={qs({ sort: "risk", dir: "desc" })}
            aria={`Importo a rischio ${formatEuro(k.atRisk.total)}: non coperto ${formatEuro(k.atRisk.uncovered)}, in slittamento ${formatEuro(k.atRisk.slipping)}`}
            extra={<div className="kpi-split"><span title="Fabbisogno oltre la disponibilità sulla previsione approvata">Non coperto {formatEuro(k.atRisk.uncovered)}</span><span title="Previsione dell'anno corrente su procedure da riprogrammare">In slittamento {formatEuro(k.atRisk.slipping)}</span></div>}
          />
        </section>
      )}

      <section className="card" aria-labelledby="ann" style={{ marginTop: 16, maxWidth: 600 }}>
        <h2 id="ann">Fabbisogno per annualità</h2>
        <AnnualChart rows={data.annual} />
      </section>

      <h2 style={{ marginTop: 32 }}>Procedure per fase</h2>
      <section aria-label="Procedure per fase" className="grid kpi-grid">
        {[...data.byStatus].sort((a, b) => statusOrder(a.status) - statusOrder(b.status)).map((s) => (
          <Kpi
            key={s.status}
            label={STATUS_LABEL[s.status] ?? s.status}
            value={s.n}
            sub="procedure in questa fase"
            href={qs({ status: s.status })}
            aria={`${STATUS_LABEL[s.status] ?? s.status}: ${s.n} procedure`}
          />
        ))}
      </section>

      <section className="card" aria-labelledby="att" style={{ marginTop: 16 }}>
        <div className="page-head" style={{ marginBottom: 8 }}>
          <h2 id="att">Richiede attenzione</h2>
          <div className="actions">
            <Link className="btn btn-secondary btn-sm" href={qs({ health: "RED" })}>
              Vedi le rosse
            </Link>
            <Link className="btn btn-secondary btn-sm" href={qs({ health: "AMBER" })}>
              Vedi le ambra
            </Link>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Procedure rosse e ambra ordinate per severità</caption>
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
      </section>
    </>
  );
}
