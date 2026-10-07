import { OctagonAlert } from "lucide-react";
import Link from "next/link";
import { executionModuleEnabled } from "@/application/modules";
import { formatDateIt, formatDateTimeIt, formatEuro, formatEuroCompact } from "@/contracts/format";
import { dashboard } from "@/server/queries";
import { db, pageActor, sp } from "@/server/page";
import { AnnualChart } from "@/ui/annual-chart";
import { Deadline, Euro, HealthBadge, StatusChip } from "@/ui/badges";
import { HEALTH_LABEL, STATUS_LABEL } from "@/ui/labels";

export const metadata = { title: "Dashboard" };

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
  const data = dashboard(db(), actor, { ...(structure ? { structure } : {}) });
  const k = data.kpi;
  const module2 = executionModuleEnabled(db());
  const signedCount = data.byStatus.filter((x) => ["EXECUTION", "CLOSING", "CLOSED"].includes(x.status)).reduce((t, x) => t + Number(x.n), 0);
  const ref = formatDateIt(data.referenceDate);
  const structures = db().prepare("SELECT DISTINCT s.code, s.name FROM structures s JOIN procedures p ON p.structure_code = s.code ORDER BY s.name").all() as { code: string; name: string }[];
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard direzionale</h1>
          <div className="page-meta">
            Data di riferimento {ref} · ultimo ricalcolo {formatDateTimeIt(data.updatedAt)} · fonte: run_checks deterministico
          </div>
        </div>
        <form className="actions" method="get">
          <label htmlFor="structure" className="sr-only">
            Struttura
          </label>
          <select id="structure" name="structure" defaultValue={structure ?? ""}>
            <option value="">Tutte le strutture</option>
            {structures.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm">Applica</button>
        </form>
      </div>

      <section aria-label="Indicatori principali" className="grid grid-4">
        <Kpi label="Procedure monitorate" value={k.proceduresTotal} sub={`al ${ref}`} href="/portafoglio" aria={`Procedure monitorate: ${k.proceduresTotal}. Apri il portafoglio`} extra={<div className="kpi-split"><span>{HEALTH_LABEL.RED} {k.health.RED}</span><span>{HEALTH_LABEL.AMBER} {k.health.AMBER}</span><span>{HEALTH_LABEL.GREEN} {k.health.GREEN}</span></div>} />
        <Kpi label="In ritardo" value={k.proceduresLate} sub={`su ${k.proceduresTotal} · ${module2 ? "milestone o SAL scaduti" : "passi scaduti"}`} href="/portafoglio?health=RED" aria={`Procedure in ritardo: ${k.proceduresLate} su ${k.proceduresTotal}`} />
        <Kpi label="Da riprogrammare" value={k.toReschedule} sub="milestone bloccante oltre T+1" href="/portafoglio?reschedule=1" aria={`Procedure da riprogrammare: ${k.toReschedule}`} />
        <Kpi label="Alert critici" value={k.criticalAlerts} sub={`aperti al ${ref}`} href="/alert?view=critical" aria={`Alert critici: ${k.criticalAlerts}`} extra={k.criticalAlerts ? <div className="kpi-sub" style={{ color: "var(--health-red-fg)" }}><OctagonAlert size={14} aria-hidden /> da prendere in carico</div> : null} />
        <Kpi label="Programmato" value={formatEuroCompact(k.programmed)} sub={`${formatEuro(k.programmed)} · escluse le annullate`} href="/portafoglio?sort=programmed&dir=desc" aria={`Programmato ${formatEuro(k.programmed)}`} />
        <Kpi label="Contrattualizzato" value={formatEuroCompact(k.contracted)} sub={`${formatEuro(k.contracted)} · contratti stipulati`} href="/portafoglio?status=EXECUTION,CLOSING,CLOSED" aria={`Contrattualizzato ${formatEuro(k.contracted)}`} />
        {module2 ? <Kpi label="Pagato" value={formatEuroCompact(k.paid)} sub={formatEuro(k.paid)} href="/portafoglio?status=EXECUTION,CLOSING,CLOSED" aria={`Pagato ${formatEuro(k.paid)}`} /> : <Kpi label="Contratti stipulati" value={signedCount} sub="procedure con Modulo 1 completato" href="/portafoglio?status=EXECUTION,CLOSING,CLOSED" aria={`Contratti stipulati: ${signedCount}`} />}
        <Kpi
          label="Importo a rischio"
          value={formatEuroCompact(k.atRisk.total)}
          sub={formatEuro(k.atRisk.total)}
          href="/portafoglio?sort=risk&dir=desc"
          aria={`Importo a rischio ${formatEuro(k.atRisk.total)}: non coperto ${formatEuro(k.atRisk.uncovered)}, in slittamento ${formatEuro(k.atRisk.slipping)}`}
          extra={<div className="kpi-split"><span title="Fabbisogno oltre la disponibilità sulla previsione approvata">Non coperto {formatEuro(k.atRisk.uncovered)}</span><span title="Previsione dell'anno corrente su procedure da riprogrammare">In slittamento {formatEuro(k.atRisk.slipping)}</span></div>}
        />
      </section>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <section className="card" aria-labelledby="ann">
          <h2 id="ann">Fabbisogno per annualità</h2>
          <AnnualChart rows={data.annual} />
        </section>
        <section className="card" aria-labelledby="fasi">
          <h2 id="fasi">Procedure per fase</h2>
          <table className="data">
            <caption className="sr-only">Procedure per fase</caption>
            <thead>
              <tr>
                <th scope="col">Fase</th>
                <th scope="col" className="num">Procedure</th>
              </tr>
            </thead>
            <tbody>
              {data.byStatus.map((s) => (
                <tr key={s.status}>
                  <td>
                    <Link href={`/portafoglio?status=${s.status}`}>{STATUS_LABEL[s.status] ?? s.status}</Link>
                  </td>
                  <td className="num">{s.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card" aria-labelledby="att" style={{ marginTop: 16 }}>
        <div className="page-head" style={{ marginBottom: 8 }}>
          <h2 id="att">Richiede attenzione</h2>
          <div className="actions">
            <Link className="btn btn-secondary btn-sm" href="/portafoglio?health=RED">
              Vedi le rosse
            </Link>
            <Link className="btn btn-secondary btn-sm" href="/portafoglio?health=AMBER">
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
