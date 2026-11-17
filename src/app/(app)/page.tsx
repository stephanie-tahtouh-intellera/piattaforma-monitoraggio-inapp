import { Inbox, Info, OctagonAlert, Plus } from "lucide-react";
import Link from "next/link";
import { executionModuleEnabled } from "@/application/modules";
import { formatDateIt, formatDateTimeIt, formatEuro, formatEuroCompact, formatPercentIt } from "@/contracts/format";
import { dashboard, financialKpiByType, garaKpiList } from "@/server/queries";
import { db, pageActor, sp } from "@/server/page";
import { AnnualChart, type AnnualView } from "@/ui/annual-chart";
import { AutoSubmitSelect } from "@/ui/auto-submit";
import { Deadline, Euro, HealthBadge, StatusChip } from "@/ui/badges";
import { KPI_HELP } from "@/ui/kpi-help";
import { HEALTH_LABEL, OWNER_LABEL, STATUS_LABEL, TYPE_LABEL } from "@/ui/labels";
import { BarChart } from "@/ui/bar-chart";
import { PhaseChart } from "@/ui/phase-chart";
import { StackedBar } from "@/ui/stacked-bar";
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
    <Link className="kpi-card" href={href} aria-label={help ? `${aria}. ${help}` : aria}>
      <div className="kpi-label">
        {label}
        {/* La definizione esce dalla «i» in alto a destra, non dal fondo della card (DEC-128).
            Sta in `data-tip` e non nel DOM: cosi' non entra nel contenuto testuale della card
            (che i test e2e cercano per sottostringa) e non viene letta due volte, essendo gia'
            nell'aria-label del link. */}
        {help ? (
          <span className="kpi-info" data-tip={help}>
            <Info size={15} aria-hidden />
          </span>
        ) : null}
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
    // Da quale sezione si e' usciti (DEC-131): il portafoglio la rimanda indietro con
    // «Torna alla dashboard», che altrimenti riportava sempre a Panoramica.
    if (tab !== "panoramica") u.set("tab", tab);
    for (const [key, v] of Object.entries(extra)) if (v) u.set(key, v);
    return `/portafoglio?${u.toString()}`;
  };
  // Vista del grafico del fabbisogno (DEC-133): livelli o solo margine. Sta nell'indirizzo
  // come gli altri filtri, cosi' sopravvive al ricaricamento e si puo' condividere.
  const annualView: AnnualView = sp(q.annual) === "margine" ? "margine" : "livelli";
  const annualHref = (v: AnnualView) => {
    const u = new URLSearchParams();
    if (type) u.set("type", type);
    if (structure) u.set("structure", structure);
    u.set("tab", "finanza");
    if (v !== "livelli") u.set("annual", v);
    return `/?${u.toString()}`;
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

  // Geometria della barra di ripartizione: conteggi, non importi (nessun vincolo DEC-033).
  // I conteggi possono arrivare come stringhe da Postgres, quindi vanno convertiti.
  const health = { RED: Number(k.health.RED), AMBER: Number(k.health.AMBER), GREEN: Number(k.health.GREEN) };
  const healthTotal = health.RED + health.AMBER + health.GREEN;
  const healthPct = (n: number) => (healthTotal > 0 ? (n / healthTotal) * 100 : 0);
  // Chi deve prendere in carico gli alert critici (DEC-127): la scheda diceva «da prendere in
  // carico» senza soggetto, mentre il dato il soggetto ce l'ha.
  const criticalOwners = data.alertsByOwner
    .filter((a) => a.critical > 0)
    // Ordinate per numero di critici, non per totale degli alert: qui si sta dicendo
    // chi ha piu' urgenze, non chi ha la coda piu' lunga.
    .sort((a, b) => b.critical - a.critical)
    .map((a) => `${OWNER_LABEL[a.owner] ?? a.owner} ${a.critical}`)
    .join(" · ");
  const topOwner = data.alertsByOwner[0];
  const alertsOwnerAria = topOwner
    ? `Alert aperti per chi deve agire. Il carico maggiore è su ${OWNER_LABEL[topOwner.owner] ?? topOwner.owner} con ${topOwner.n} alert. ${data.alertsByOwner.map((a) => `${OWNER_LABEL[a.owner] ?? a.owner}: ${a.n}${a.critical ? ` di cui ${a.critical} critici` : ""}`).join(", ")}.`
    : "Alert aperti per chi deve agire.";
  const byStatusOrdered = [...data.byStatus].sort((a, b) => statusOrder(a.status) - statusOrder(b.status));
  const statusAria = `Procedure per fase, in ordine di avanzamento nel tempo. ${byStatusOrdered.filter((x) => x.status !== "CANCELLED").map((x) => `${STATUS_LABEL[x.status] ?? x.status}: ${x.n}${x.late ? ` di cui ${x.late} in ritardo` : ""}`).join(", ")}.`;
  // La tabella parla solo delle fasi dove un ritardo c'e' davvero: altrove sarebbero righe di trattini.
  const lateByPhase = byStatusOrdered.filter((x) => x.late > 0);
  // Scadenze attorno alla data di riferimento (DEC-132): a sinistra l'arretrato, piu'
  // profondo man mano che si va indietro, a destra quello che sta per arrivare.
  const dl = data.deadlines;
  const deadlineBuckets = [
    { status: "late180", label: "oltre 180 gg", n: dl.late180, late: dl.late180 },
    { status: "late91", label: "91–180 gg", n: dl.late91, late: dl.late91 },
    { status: "late31", label: "31–90 gg", n: dl.late31, late: dl.late31 },
    { status: "late1", label: "fino a 30 gg", n: dl.late1, late: dl.late1 },
    { status: "next7", label: "entro 7 gg", n: dl.next7, late: 0 },
    { status: "next30", label: "8–30 gg", n: dl.next30, late: 0 },
    { status: "nextOver", label: "oltre 30 gg", n: dl.nextOver, late: 0 },
  ];
  const deadlineAria = `Scadenze per distanza dalla data di riferimento. In ritardo: ${dl.late180 + dl.late91 + dl.late31 + dl.late1} procedure. In arrivo: ${dl.next7 + dl.next30 + dl.nextOver}. Senza una prossima scadenza: ${dl.none}.`;
  // Le annullate escono dall'asse del tempo: non sono una fase del percorso, e metterle in
  // fondo direbbe che vengono dopo la stipula. Si contano a parte, sotto il grafico.
  const phaseRows = byStatusOrdered.filter((x) => x.status !== "CANCELLED");
  // «A che punto sono i soldi» (DEC-130): il programmato diviso per la fase raggiunta.
  // Scala sequenziale di blu, dal chiaro al scuro seguendo l'avanzamento: le fasi hanno
  // un ordine, quindi la tinta puo' portarlo senza inventare otto colori diversi.
  const PHASE_RAMP = ["--primary-200", "--primary-300", "--primary-400", "--primary-500", "--primary-600", "--primary-700", "--primary-800"];
  const moneyByPhase = phaseRows
    .filter((x) => x.programmedShare > 0)
    .map((x, i) => ({
      key: x.status,
      label: STATUS_LABEL[x.status] ?? x.status,
      amount: x.programmed,
      share: x.programmedShare,
      href: qs({ status: x.status }),
      color: `var(${PHASE_RAMP[Math.min(i, PHASE_RAMP.length - 1)]})`,
    }));
  const moneyAria = `Programmato per fase raggiunta. ${moneyByPhase.map((x) => `${x.label}: ${formatEuro(x.amount)}`).join(", ")}.`;
  const cancelled = byStatusOrdered.find((x) => x.status === "CANCELLED")?.n ?? 0;

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

      <nav className="tabs tabs-center" aria-label="Sezioni della dashboard">
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
          <div className="grid kpi-grid" style={{ marginTop: 8 }}>
            <Kpi label="Procedure monitorate" value={k.proceduresTotal} sub={`al ${ref}`} href={qs()} aria={`Procedure monitorate: ${k.proceduresTotal}. Apri il portafoglio`} help={KPI_HELP.proceduresTotal} extra={
              <div className="kpi-health">
                {healthTotal > 0 ? (
                  <span className="seg" aria-hidden>
                    <i style={{ width: `${healthPct(health.RED)}%`, background: "var(--health-red-solid)" }} />
                    <i style={{ width: `${healthPct(health.AMBER)}%`, background: "var(--health-amber-solid)" }} />
                    <i style={{ width: `${healthPct(health.GREEN)}%`, background: "var(--health-green-solid)" }} />
                  </span>
                ) : null}
                <div className="kpi-split">
                  <span><i className="dot dot-red" aria-hidden />{HEALTH_LABEL.RED} {health.RED}</span>
                  <span><i className="dot dot-amber" aria-hidden />{HEALTH_LABEL.AMBER} {health.AMBER}</span>
                  <span><i className="dot dot-green" aria-hidden />{HEALTH_LABEL.GREEN} {health.GREEN}</span>
                </div>
              </div>
            } />
            <Kpi label="In ritardo" value={k.proceduresLate} sub={`su ${k.proceduresTotal} · ${module2 ? "milestone o SAL scaduti" : "passi scaduti"}`} href={qs({ health: "RED" })} aria={`Procedure in ritardo: ${k.proceduresLate} su ${k.proceduresTotal}`} help={KPI_HELP.proceduresLate} />
            <Kpi label="Da riprogrammare" value={k.toReschedule} sub="milestone bloccante oltre T+1" href={qs({ reschedule: "1" })} aria={`Procedure da riprogrammare: ${k.toReschedule}`} help={KPI_HELP.toReschedule} />
            <Kpi label="Alert critici" value={k.criticalAlerts} sub={`aperti al ${ref}`} href="/alert?view=critical" aria={`Alert critici: ${k.criticalAlerts}${criticalOwners ? `, da prendere in carico: ${criticalOwners}` : ""}`} help={KPI_HELP.criticalAlerts} extra={criticalOwners ? <div className="kpi-sub" style={{ color: "var(--health-red-fg)" }}><OctagonAlert size={14} aria-hidden /> da prendere in carico: {criticalOwners}</div> : null} />
            <Kpi label="Procedure attive" value={k.proceduresActive} sub="non in bozza, chiuse o annullate" href={qs()} aria={`Procedure attive: ${k.proceduresActive}`} help={KPI_HELP.proceduresActive} />
            <Kpi label="Procedure da avviare" value={k.proceduresToStart} sub="ancora in bozza" href={qs({ status: "DRAFT" })} aria={`Procedure da avviare: ${k.proceduresToStart}`} help={KPI_HELP.proceduresToStart} />
            <Kpi label="Richieste di riprogrammazione" value={k.reprogramRequests} sub="versioni approvate oltre la baseline" href={qs()} aria={`Richieste di riprogrammazione: ${k.reprogramRequests}`} help={KPI_HELP.reprogramRequests} />
            {riskKpi}
          </div>
          <div className="card dash-below">
            <div className="card-head">
              <h3>Alert aperti per chi deve agire</h3>
              <InfoChip text={KPI_HELP.alertsByOwner} />
            </div>
            <BarChart
              aria={alertsOwnerAria}
              emptyText="Nessun alert aperto nel perimetro filtrato."
              rows={data.alertsByOwner.map((a) => ({
                key: a.owner,
                label: OWNER_LABEL[a.owner] ?? a.owner,
                value: a.n,
                // Stesso perimetro del conteggio: solo alert (non anomalie) e solo quelli
                // aperti o presi in carico, altrimenti la barra dice 17 e l'elenco ne apre 48.
                href: `/alert?owner=${encodeURIComponent(a.owner)}&kind=ALERT&status=OPEN%2CACKNOWLEDGED`,
                aria: `${OWNER_LABEL[a.owner] ?? a.owner}: ${a.n} alert aperti${a.critical ? `, di cui ${a.critical} critici` : ""}. Apri il centro alert filtrato`,
              }))}
            />
          </div>
        </section>
      ) : null}

      {tab === "finanza" ? (
        <section aria-labelledby="h-finanza">
          <h2 id="h-finanza">Quadro finanziario</h2>
          <p className="page-meta">Importi IVA inclusa salvo indicazione contraria, sullo stesso perimetro filtrato.</p>
          <div className="grid kpi-grid kpi-grid-3" style={{ marginTop: 8 }}>
            <Kpi label="Programmato" value={formatEuroCompact(fin ? fin.totals.programmed : k.programmed)} sub={`${formatEuro(fin ? fin.totals.programmed : k.programmed)} · escluse le annullate`} href={qs({ sort: "programmed", dir: "desc" })} aria={`Programmato ${formatEuro(fin ? fin.totals.programmed : k.programmed)}`} help={KPI_HELP.programmed} />
            {r ? <Kpi label="Base di gara" value={formatEuroCompact(r.totals.base)} sub={`${formatEuro(r.totals.base)} · IVA esclusa`} href={qs()} aria={`Base di gara ${formatEuro(r.totals.base)}`} help={KPI_HELP.base} /> : null}
            <Kpi label="Contrattualizzato" value={formatEuroCompact(fin ? fin.totals.contracted : k.contracted)} sub={`${formatEuro(fin ? fin.totals.contracted : k.contracted)} · contratti stipulati`} href={qs({ status: "EXECUTION,CLOSING,CLOSED" })} aria={`Contrattualizzato ${formatEuro(fin ? fin.totals.contracted : k.contracted)}`} help={KPI_HELP.contracted} />
            {r ? <Kpi label="Aggiudicato" value={formatEuroCompact(r.totals.awardedNet)} sub={`${formatEuro(r.totals.awardedNet)} · IVA esclusa`} href={qs()} aria={`Aggiudicato ${formatEuro(r.totals.awardedNet)}`} help={KPI_HELP.awardedNet} /> : null}
            {paidOrSignedKpi}
            {riskKpi}
          </div>
          <div className="card dash-below">
            <div className="card-head">
              <h3>A che punto sono i soldi</h3>
              <InfoChip text={KPI_HELP.moneyByPhase} />
            </div>
            <StackedBar rows={moneyByPhase} aria={moneyAria} totalLabel="Programmato nel perimetro" total={fin ? fin.totals.programmed : k.programmed} />
          </div>
          <div className="card dash-below">
            <div className="card-head">
              <h3>Fabbisogno per annualità</h3>
              <InfoChip text={KPI_HELP.annual} />
            </div>
            <AnnualChart rows={data.annual} view={annualView} viewHref={annualHref} />
          </div>
        </section>
      ) : null}

      {tab === "affidamenti" && r ? (
        <section aria-labelledby="h-affidamenti">
          <h2 id="h-affidamenti">Tipologie e andamento degli affidamenti</h2>
          <p className="page-meta">Come si distribuiscono le procedure per tipologia e come vanno le gare competitive.</p>
          <div className="grid kpi-grid" style={{ marginTop: 8 }}>
            <Kpi label="Procedure aggiudicate" value={r.totals.awardedCount} sub={`su ${r.totals.count} nel tuo perimetro`} href={qs()} aria={`Procedure aggiudicate: ${r.totals.awardedCount} su ${r.totals.count}`} help={KPI_HELP.awardedCount} />
            <Kpi label="Ribasso medio" value={formatPercentIt(r.totals.ribasso)} sub={`su ${r.totals.competitiveAwardedCount} gare competitive aggiudicate`} href={qs()} aria={`Ribasso medio ${formatPercentIt(r.totals.ribasso)}`} help={KPI_HELP.ribasso} />
            <Kpi label="Spesa su gara competitiva" value={r.totals.competitiveProgrammedShare !== null ? formatPercentIt(r.totals.competitiveProgrammedShare) : "n.d."} sub="negoziata, aperta, accordo quadro" href={qs()} aria={`Spesa su gara competitiva: ${r.totals.competitiveProgrammedShare !== null ? formatPercentIt(r.totals.competitiveProgrammedShare) : "non disponibile"}`} help={KPI_HELP.competitiveShare} />
            <Kpi label="Giorni indizione → aggiudicazione" value={r.totals.averageAwardDurationDays !== null ? r.totals.averageAwardDurationDays : "n.d."} sub="media sulle procedure con entrambe le date" href={qs()} aria={`Giorni indizione aggiudicazione: ${r.totals.averageAwardDurationDays ?? "non disponibile"}`} help={KPI_HELP.awardDuration} />
          </div>
          <div className="card dash-below">
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
          <div className="card" style={{ marginTop: 8 }}>
            <div className="card-head">
              <h3>Procedure per fase</h3>
              <InfoChip text={KPI_HELP.byStatus} />
            </div>
            <div className="legend" aria-hidden>
              <span><i style={{ background: "var(--chart-1)" }} />In questa fase</span>
              <span><i style={{ background: "var(--health-red-solid)" }} />di cui in ritardo</span>
            </div>
            <PhaseChart aria={statusAria} rows={phaseRows.map((x) => ({ status: x.status, label: STATUS_LABEL[x.status] ?? x.status, n: x.n, late: x.late, href: qs({ status: x.status }) }))} />
            {cancelled > 0 ? (
              <p className="chart-note muted">
                Fuori dal percorso: <Link href={qs({ status: "CANCELLED" })}>{cancelled} procedure annullate</Link>.
              </p>
            ) : null}
          </div>
          {lateByPhase.length > 0 ? (
            <div className="card dash-below">
              <div className="card-head">
                <h3>Dove si accumula il ritardo</h3>
                <InfoChip text={KPI_HELP.lateByPhase} />
              </div>
              <div className="table-wrap">
                <table className="data compact">
                  <caption className="sr-only">Ritardo per fase del processo</caption>
                  <thead>
                    <tr>
                      <th scope="col">Fase</th>
                      <th scope="col" className="num">Procedure</th>
                      <th scope="col" className="num">In ritardo</th>
                      <th scope="col" className="num">Ritardo medio</th>
                      <th scope="col">Più indietro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lateByPhase.map((x) => (
                      <tr key={x.status}>
                        <th scope="row">{STATUS_LABEL[x.status] ?? x.status}</th>
                        <td className="num">{x.n}</td>
                        <td className="num">{x.late}</td>
                        <td className="num">{x.lateAvgDays === null ? "—" : `${x.lateAvgDays} gg`}</td>
                        <td>
                          {x.worstCode ? (
                            <>
                              <Link href={`/procedure/${x.worstCode}`} className="mono">{x.worstCode}</Link>
                              {x.worstDays === null ? null : <span className="muted"> · {x.worstDays} gg</span>}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "attenzione" ? (
        <section aria-labelledby="h-attenzione">
          <div className="page-head" style={{ marginBottom: 8 }}>
            <div>
              <h2 id="h-attenzione">Richiede attenzione</h2>
              {/* Dice in che cosa questa sezione differisce dal Centro alert (DEC-131):
                  li' si lavorano gli alert uno per uno, qui si guardano le procedure. */}
              <p className="page-meta">
                Quanto il portafoglio è fuori tempo e quanto vale. Il <Link href="/alert">Centro alert</Link> elenca i singoli alert da prendere in carico; qui si guardano le procedure.
              </p>
            </div>
            <div className="actions">
              <Link className="btn btn-secondary btn-sm" href={qs({ health: "RED" })}>
                Vedi le rosse
              </Link>
              <Link className="btn btn-secondary btn-sm" href={qs({ health: "AMBER" })}>
                Vedi le gialle
              </Link>
              <Link className="btn btn-secondary btn-sm" href={qs({ health: "RED,AMBER", sort: "deadline" })}>
                Vedi tutte
              </Link>
            </div>
          </div>
          <div className="grid kpi-grid" style={{ marginTop: 8 }}>
            <Kpi label="Scadenze già passate" value={k.proceduresLate} sub={k.maxLateDays === null ? "nessun ritardo" : `la più indietro di ${k.maxLateDays} giorni`} href={qs({ sort: "deadline", dir: "asc" })} aria={`Scadenze già passate: ${k.proceduresLate}`} help={KPI_HELP.overdue} />
            <Kpi label="In scadenza entro 7 giorni" value={k.dueIn7} sub={`${k.dueIn30} entro 30 giorni`} href={qs({ sort: "deadline", dir: "asc" })} aria={`In scadenza entro 7 giorni: ${k.dueIn7}`} help={KPI_HELP.dueSoon} />
            <Kpi label="Procedure rosse" value={health.RED} sub={`${formatEuroCompact(k.redProgrammed)} programmati`} href={qs({ health: "RED" })} aria={`Procedure rosse: ${health.RED}, ${formatEuro(k.redProgrammed)} programmati`} help={KPI_HELP.red} />
            <Kpi label="Da riprogrammare" value={k.toReschedule} sub="milestone bloccante oltre T+1" href={qs({ reschedule: "1" })} aria={`Procedure da riprogrammare: ${k.toReschedule}`} help={KPI_HELP.toReschedule} />
            {riskKpi}
            <Kpi label="Anomalie di dato" value={k.openAnomalies} sub="aperte, non correggono i dati" href="/alert?kind=ANOMALY" aria={`Anomalie di dato aperte: ${k.openAnomalies}`} help={KPI_HELP.anomalies} />
          </div>
          <div className="card dash-below">
            <div className="card-head">
              <h3>Quanto è profondo l&apos;arretrato</h3>
              <InfoChip text={KPI_HELP.deadlines} />
            </div>
            <div className="legend" aria-hidden>
              <span><i style={{ background: "var(--health-red-solid)" }} />Scadenze già passate</span>
              <span><i style={{ background: "var(--chart-1)" }} />Ancora da scadere</span>
            </div>
            <PhaseChart rows={deadlineBuckets} aria={deadlineAria} axisLabel="← in ritardo" axisLabelRight="in arrivo →" divider={{ afterKey: "late1", label: ref }} />
            {dl.none > 0 ? (
              <p className="chart-note muted">
                Restano fuori <Link href={qs({ status: "EXECUTION,CLOSING,CLOSED" })}>{dl.none} procedure senza una prossima scadenza obbligatoria</Link>, quasi tutte con il contratto già stipulato.
              </p>
            ) : null}
          </div>
          <div className="card dash-below">
            <div className="card-head">
              <h3>Le cinque più urgenti</h3>
              <InfoChip text={KPI_HELP.attention} />
            </div>
            <div className="table-wrap">
              <table className="data compact">
                <caption className="sr-only">Procedure rosse e gialle ordinate per severità</caption>
                <thead>
                  <tr>
                    <th scope="col">Codice</th>
                    <th scope="col">Oggetto</th>
                    <th scope="col">Fase</th>
                    <th scope="col">Health</th>
                    <th scope="col">Prossima scadenza</th>
                    <th scope="col" className="num">A rischio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attention.slice(0, 5).map((p) => (
                    <tr key={p.code}>
                      <td className="mono">
                        <Link href={`/procedure/${p.code}`}>{p.code}</Link>
                      </td>
                      <td className="title">
                        <span className="clamp1" title={p.title}>{p.title}</span>
                      </td>
                      <td><StatusChip value={p.status} /></td>
                      <td><HealthBadge value={p.health} drivers={p.healthDrivers} /></td>
                      <td><Deadline d={p.nextDeadline} compact /></td>
                      <td className="num"><Euro v={p.atRisk} /></td>
                    </tr>
                  ))}
                  {data.attention.length === 0 ? (
                    <tr><td colSpan={6} className="empty"><Inbox size={24} aria-hidden />Nessuna procedura richiede attenzione.</td></tr>
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
