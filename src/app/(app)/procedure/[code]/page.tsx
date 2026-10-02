import Link from "next/link";
import { notFound } from "next/navigation";
import { DomainError } from "@/application/errors";
import { formatDateIt, formatEuro } from "@/contracts/format";
import { addDays, daysBetween, isoDate } from "@/domain/dates";
import { can } from "@/server/authz";
import { procedureDetail } from "@/server/queries";
import { db, pageActor, sp } from "@/server/page";
import { ActionForm } from "@/ui/action-form";
import { AnnualChart } from "@/ui/annual-chart";
import { DateIt, Deadline, Euro, HealthBadge, MilestoneBadge, SalBadge, StatusChip } from "@/ui/badges";
import { MOVEMENT_LABEL, OWNER_LABEL, SIM_STATUS_LABEL, TYPE_LABEL } from "@/ui/labels";
import { AlertTable, AuditTable } from "@/ui/tables";
import { UploadForm } from "@/ui/upload-form";

const TABS = [
  ["overview", "Panoramica"],
  ["timeline", "Cronoprogramma"],
  ["finance", "Finanza"],
  ["documents", "Documenti"],
  ["alerts", "Alert"],
  ["simulations", "Simulazioni"],
  ["audit", "Audit"],
] as const;

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  return { title: (await params).code };
}

export default async function ProcedurePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await pageActor();
  const { code } = await params;
  const tab = sp((await searchParams).tab) ?? "overview";
  let d: ReturnType<typeof procedureDetail>;
  try {
    d = procedureDetail(db(), actor, decodeURIComponent(code));
  } catch (e) {
    if (e instanceof DomainError && e.status === 404) notFound();
    if (e instanceof DomainError && e.status === 403)
      return (
        <div className="alert-box error" role="alert">
          <h1>Accesso non consentito</h1>
          <p>La procedura {code} è fuori dal tuo ambito di visibilità. Nessun dato è stato mostrato.</p>
          <Link href="/portafoglio">Torna al portafoglio</Link>
        </div>
      );
    throw e;
  }
  const p = d.procedure;
  const ev = d.evaluation;
  const tabs = d.supplierView ? TABS.filter(([k]) => ["overview", "finance", "documents"].includes(k)) : TABS.filter(([k]) => k !== "audit" || can(actor, "audit.read"));
  const ref = d.referenceDate;

  return (
    <>
      <nav className="breadcrumb" aria-label="Percorso">
        <Link href="/portafoglio">Portafoglio</Link> › <span aria-current="page">{p.code} {p.title}</span>
      </nav>
      <section className="proc-head" aria-labelledby="ptitle">
        <div>
          <div className="actions">
            <span className="mono">{p.code}</span>
            <StatusChip value={ev.status} />
            <HealthBadge value={ev.health} drivers={ev.healthDrivers} />
            {ev.rescheduleRequired ? <span className="badge badge-RED">Riprogrammazione richiesta</span> : null}
          </div>
          <h1 id="ptitle" style={{ marginTop: 8 }}>{p.title}</h1>
          <dl className="meta-grid">
            <div><dt>Tipologia</dt><dd>{TYPE_LABEL[p.type] ?? p.type}</dd></div>
            <div><dt>Modello</dt><dd title={p.templateLabel}>{p.template}</dd></div>
            <div><dt>Struttura / linea</dt><dd>{p.operation ?? p.structure}</dd></div>
            <div><dt>CIG</dt><dd className="mono">{p.cig || "n.d."}</dd></div>
            <div><dt>Programmato</dt><dd><Euro v={ev.programmed} /></dd></div>
            <div><dt>Contrattualizzato</dt><dd>{ev.contracted ? <Euro v={ev.contracted} /> : "—"}</dd></div>
            <div><dt>Pagato / residuo</dt><dd><Euro v={ev.paid} /> / <Euro v={ev.residual} /></dd></div>
            <div><dt>Prossima scadenza</dt><dd><Deadline d={ev.nextDeadline ? { date: ev.nextDeadline.due, label: ev.nextDeadline.label, days: ev.nextDeadline.daysUntil } : null} /></dd></div>
          </dl>
        </div>
        <div className="actions" style={{ alignItems: "flex-start", flexDirection: "column" }}>
          {can(actor, "simulation.create") && d.rescheduleSource && !p.cancelledAt && !p.closedAt ? (
            <Link className="btn btn-primary" href={`/procedure/${p.code}/riprogrammazione`}>Avvia simulazione di riprogrammazione</Link>
          ) : null}
          {can(actor, "export") ? <a className="btn btn-secondary" href={`/api/exports/procedures/${p.code}.pdf`}>Report PDF</a> : null}
        </div>
      </section>

      <nav className="tabs" aria-label="Sezioni della procedura">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/procedure/${p.code}?tab=${k}`} aria-current={tab === k ? "page" : undefined}>
            {l}
            {k === "alerts" && d.alerts.filter((a: any) => a.status === "OPEN").length ? ` (${d.alerts.filter((a: any) => a.status === "OPEN").length})` : ""}
          </Link>
        ))}
      </nav>

      {ev.status === "DRAFT" && (actor.role === "STRUCTURE_USER" || actor.role === "ADMIN") ? (
        <section className="card" style={{ marginBottom: 16 }} data-tour="memoria">
          <h2>Consegna della memoria</h2>
          <p className="muted">Alla consegna la baseline si congela e la titolarità passa all'Ufficio Gare (US-013, US-033).</p>
          <ActionForm endpoint={`/api/procedures/${p.code}/memory/submit`} submitLabel="Consegna memoria" fields={[{ name: "date", label: "Data di consegna", type: "date", required: true, defaultValue: ref }, { name: "note", label: "Protocollo o nota", type: "textarea" }]} successMessage="Memoria consegnata: baseline congelata." />
        </section>
      ) : null}
      {tab === "overview" ? (
        <div className="grid grid-2">
          <section className="card">
            <h2>Perché questo stato</h2>
            {ev.healthDrivers.length ? (
              <ul>{ev.healthDrivers.map((x, i) => <li key={i}>{x.message} <span className="small muted">({x.rule})</span></li>)}</ul>
            ) : (
              <p className="muted">Nessuna criticità: nessuna scadenza entro 10 giorni, nessuna anomalia aperta.</p>
            )}
            <h3 style={{ marginTop: 16 }}>Baseline, previsione ed effettivo</h3>
            <table className="data">
              <thead><tr><th>Milestone</th><th>Baseline</th><th>Previsione</th><th>Effettivo</th><th className="num">Scostamento</th></tr></thead>
              <tbody>
                {d.timeline.map((m) => (
                  <tr key={m.code}>
                    <td>{m.label}</td>
                    <td><DateIt v={m.baseline} /></td>
                    <td><DateIt v={m.forecast} /></td>
                    <td>{m.actual ? <DateIt v={m.actual} /> : <span className="muted">—</span>}</td>
                    <td className="num">{m.deviationDays === null ? "n.d." : `${m.deviationDays > 0 ? "+" : ""}${m.deviationDays} gg`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">Versioni: {d.versions.map((v: any) => `${v.label}${v.is_baseline ? " (baseline)" : ""}`).join(" → ")}</p>
          </section>
          <section className="card">
            <h2>Previsione di spesa per annualità</h2>
            <AnnualChart rows={ev.years} />
            {ev.overflows.length ? (
              <div className="alert-box error" role="alert">Disponibilità superata: {ev.overflows.map((o) => `${o.year} di ${formatEuro(o.amount)}`).join("; ")}</div>
            ) : null}
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>Importo a rischio</dt><dd><Euro v={ev.atRisk.total} /> (non coperto <Euro v={ev.atRisk.uncovered} />, in slittamento <Euro v={ev.atRisk.slipping} />)</dd>
              {p.anacFee && p.anacFee !== "0.00" ? (<><dt>Contributo ANAC</dt><dd><Euro v={p.anacFee} /></dd></>) : null}
              {p.sourceRow ? (<><dt>Fonte</dt><dd>Workbook PN GDL, foglio Gare_23-27, riga {p.sourceRow} · status «{p.sourceStatus || "—"}»</dd></>) : null}
              {p.activityStart ? (<><dt>Inizio / fine attività (V4)</dt><dd><DateIt v={p.activityStart} /> – <DateIt v={p.activityEnd} /></dd></>) : null}
            </dl>
            {p.iterText ? (<><h3 style={{ marginTop: 12 }}>Iter procedura (dal workbook)</h3><pre className="iter">{p.iterText}</pre></>) : null}
          </section>
        </div>
      ) : null}

      {tab === "timeline" ? <Timeline d={d} canComplete={can(actor, "milestone.update")} /> : null}

      {tab === "finance" ? <Finance d={d} actor={actor} /> : null}

      {tab === "documents" ? (
        <section className="card">
          <h2>Fascicolo documentale</h2>
          {!p.cancelledAt && (actor.role === "SUPPLIER" || actor.role === "STRUCTURE_USER" || actor.role === "PROCUREMENT_OFFICER" || can(actor, "documents.import")) ? <div data-tour="upload"><UploadForm code={p.code} /></div> : null}
          {(d.documents as any[]).some((x) => x.processing_state === "OCR_PENDING" || x.processing_state === "STORED") && can(actor, "documents.import") ? (
            <ActionForm endpoint="/api/documents/process" submitLabel="Elabora i documenti in attesa (testo + OCR)" variant="secondary" successMessage="Documenti elaborati: le proposte sono nella coda di validazione." />
          ) : null}
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Documento</th><th>Tipo</th><th>Pagine</th><th>Elaborazione</th><th>Associazione</th><th>Caricato</th><th></th></tr></thead>
              <tbody>
                {(d.documents as any[]).map((x) => (
                  <tr key={x.id}>
                    <td>{x.title ?? x.file_name}</td>
                    <td>{x.doc_type ?? "—"}{x.subtype ? ` · ${x.subtype}` : ""}</td>
                    <td className="num">{x.pages ?? "—"}</td>
                    <td>{x.processing_state === "OCR_PENDING" ? <span className="badge badge-AMBER">OCR da eseguire</span> : x.processing_state === "TEXT_EXTRACTED" ? <span className="badge badge-GREEN">Testo estratto</span> : x.processing_state === "OCR_DONE" ? <span className="badge badge-GREEN">OCR eseguito</span> : x.processing_state === "OCR_FAILED" ? <span className="badge badge-RED">OCR non riuscito</span> : <span className="chip">{x.processing_state}</span>}</td>
                    <td>{x.association_method} · affidabilità {x.association_confidence}</td>
                    <td><DateIt v={x.uploaded_at?.slice(0, 10)} /></td>
                    <td>{x.size_bytes > 0 ? <a href={`/api/documents/${x.id}/content`}>Apri</a> : <span className="muted small">file non disponibile</span>}</td>
                  </tr>
                ))}
                {d.documents.length === 0 ? <tr><td colSpan={7} className="muted">Nessun documento nel fascicolo.</td></tr> : null}
              </tbody>
            </table>
          </div>
          {d.validations.length ? (
            <>
              <h3 style={{ marginTop: 16 }}>Proposte da validare</h3>
              <ul>{(d.validations as any[]).map((v) => <li key={v.id}>{v.kind} · {v.field}: proposto <strong>{v.proposed_value}</strong>{v.current_value ? ` (validato ${v.current_value})` : ""} — {v.status} {v.excerpt ? <span className="small muted">«{v.excerpt}»</span> : null}</li>)}</ul>
              {can(actor, "validation.decide") ? <Link href="/validazione">Vai alla coda di validazione</Link> : null}
            </>
          ) : null}
        </section>
      ) : null}

      {tab === "alerts" ? (
        <section className="card">
          <h2>Alert e anomalie</h2>
          <AlertTable alerts={d.alerts as any[]} canHandle={can(actor, "alert.handle")} canSuspend={can(actor, "alert.suspend")} />
        </section>
      ) : null}

      {tab === "simulations" ? (
        <section className="card">
          <div className="page-head"><h2>Simulazioni di riprogrammazione</h2>
            {can(actor, "simulation.create") && d.rescheduleSource ? <Link className="btn btn-primary" href={`/procedure/${p.code}/riprogrammazione`}>Nuova simulazione</Link> : null}
          </div>
          <div className="table-wrap" data-tour="simulazioni">
            <table className="data">
              <thead><tr><th>Codice</th><th>Alternativa</th><th>Milestone → data</th><th className="num">Date cambiate</th><th className="num">Spostato</th><th>Criticità</th><th>Stato</th><th>Autore</th><th>Azioni</th></tr></thead>
              <tbody>
                {(d.simulations as any[]).map((s) => (
                  <tr key={s.code}>
                    <td className="mono">{s.code}</td>
                    <td>{s.kind}</td>
                    <td>{s.source_milestone} → <DateIt v={s.candidate_date} /></td>
                    <td className="num">{s.result.date_changes}</td>
                    <td className="num"><Euro v={s.result.amount_shifted} /></td>
                    <td>{s.result.criticalities.length ? s.result.criticalities.map((c: any, i: number) => <div key={i} className={`badge ${c.severity === "BLOCKING" ? "badge-RED" : "badge-AMBER"}`}>{c.code} {c.year ?? ""} {c.amount ? formatEuro(c.amount) : ""}</div>) : <span className="muted">nessuna</span>}</td>
                    <td><span className="chip">{SIM_STATUS_LABEL[s.status] ?? s.status}</span>{s.decision_reason ? <div className="small muted">«{s.decision_reason}» – {s.decided_by}</div> : null}</td>
                    <td>{s.created_by}</td>
                    <td>
                      {["DRAFT", "SUBMITTED"].includes(s.status) && can(actor, "simulation.decide") ? (
                        <div className="stack">
                          <ActionForm endpoint={`/api/reschedules/${s.code}/approve`} submitLabel="Approva" fields={[{ name: "reason", label: "Motivazione", type: "textarea", required: true, help: "Comparirà nell'audit" }, ...(s.blocking ? [{ name: "override", label: "Override delle criticità bloccanti (solo Direttore Generale)", type: "checkbox" as const }] : [])]} successMessage="Riprogrammazione approvata: nuova versione creata." />
                          <ActionForm endpoint={`/api/reschedules/${s.code}/reject`} submitLabel="Rifiuta" variant="danger" fields={[{ name: "reason", label: "Motivo del rifiuto", type: "textarea", required: true }]} />
                        </div>
                      ) : s.status === "DRAFT" && can(actor, "simulation.create") ? (
                        <ActionForm endpoint={`/api/reschedules/${s.code}/submit`} submitLabel="Invia ad approvazione" inline />
                      ) : null}
                    </td>
                  </tr>
                ))}
                {d.simulations.length === 0 ? <tr><td colSpan={9} className="muted">Nessuna simulazione.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "audit" && can(actor, "audit.read") ? (
        <section className="card">
          <h2>Audit della procedura</h2>
          <AuditTable rows={d.audit as any[]} />
        </section>
      ) : null}
      <p className="small muted" style={{ marginTop: 16 }}>Data di riferimento {formatDateIt(ref)}. Valori calcolati dal motore deterministico; nessun dato è generato da un modello di IA.</p>
    </>
  );
}

function Timeline({ d, canComplete }: { d: ReturnType<typeof procedureDetail>; canComplete: boolean }) {
  const dates = d.timeline.flatMap((m) => [m.baseline, m.forecast, m.actual]).filter(Boolean) as string[];
  dates.push(d.referenceDate);
  const min = isoDate([...dates].sort()[0]!);
  const max = isoDate([...dates].sort().at(-1)!);
  const span = Math.max(30, daysBetween(min, max) + 14);
  const pos = (s: string | null) => (s ? (daysBetween(addDays(min, -7), isoDate(s)) / span) * 100 : null);
  const todayPos = pos(d.referenceDate)!;
  const active = d.timeline.find((m) => m.active);
  return (
    <section className="card">
      <h2>Cronoprogramma</h2>
      <div className="legend"><span><i style={{ background: "var(--chart-baseline-stroke)", borderRadius: "50%" }} />Baseline</span><span><i style={{ background: "var(--primary-600)", transform: "rotate(45deg)" }} />Previsione</span><span><i style={{ background: "var(--health-green-solid)", transform: "rotate(45deg)" }} />Effettivo</span><span><i style={{ background: "var(--health-red-solid)", transform: "rotate(45deg)" }} />Scaduta</span><span><i style={{ borderLeft: "2px dashed var(--chart-today)", width: 2 }} />Data di riferimento {formatDateIt(d.referenceDate)}</span></div>
      <div className="table-wrap">
        <table className="data">
          <caption className="sr-only">Milestone con baseline, previsione, effettivo e stato</caption>
          <thead><tr><th>Milestone</th><th>Owner</th><th>Stato</th><th>Baseline</th><th>Previsione</th><th>Effettivo</th><th className="num">Scost.</th><th style={{ minWidth: 280 }}>Gantt</th></tr></thead>
          <tbody>
            {d.timeline.map((m) => (
              <tr key={m.code}>
                <td>{m.label}{m.blocking ? <span className="small muted"> · bloccante</span> : null}</td>
                <td>{OWNER_LABEL[m.owner] ?? m.owner}</td>
                <td><MilestoneBadge state={m.state} blocked={m.blocked} reason={m.blockerReason} /></td>
                <td><DateIt v={m.baseline} /></td>
                <td><DateIt v={m.forecast} /></td>
                <td>{m.actual ? <DateIt v={m.actual} /> : "—"}{m.evidence ? <div className="small muted" title={m.evidence.locator ?? ""}>fonte: {m.evidence.source_type}</div> : null}</td>
                <td className="num">{m.deviationDays === null ? "—" : `${m.deviationDays > 0 ? "+" : ""}${m.deviationDays} gg`}</td>
                <td>
                  <div className="gantt" aria-hidden>
                    <div className="today" style={{ left: `${todayPos}%` }} />
                    {m.baseline ? <div className="base-dot" style={{ left: `${pos(m.baseline)}%` }} /> : null}
                    {m.actual ? <div className="dot dot-actual" style={{ left: `${pos(m.actual)}%` }} /> : m.forecast ? <div className={`dot ${m.state === "OVERDUE" ? "dot-overdue" : "dot-forecast"}`} style={{ left: `${pos(m.forecast)}%` }} /> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canComplete && active && !d.procedure.cancelledAt ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Registra il completamento di «{active.label}»</h3>
          <ActionForm
            endpoint={`/api/procedures/${d.procedure.code}/milestones/${active.code}/complete`}
            submitLabel="Registra completamento"
            fields={[
              { name: "date", label: "Data effettiva", type: "date", required: true, defaultValue: d.referenceDate },
              { name: "note", label: "Nota o riferimento all'atto", type: "textarea", help: "Le date effettive non cambiano con le riprogrammazioni (BR-006)." },
            ]}
            successMessage="Milestone completata e controlli ricalcolati."
          />
        </div>
      ) : null}
    </section>
  );
}

function Finance({ d, actor }: { d: ReturnType<typeof procedureDetail>; actor: Parameters<typeof can>[0] }) {
  const ev = d.evaluation;
  return (
    <div className="stack">
      <section className="card">
        <h2>Contratto</h2>
        {d.contract ? (
          <dl className="kv">
            <dt>Stato</dt><dd>{d.contract.signed ? "Stipulato" : "In stipula (aggiudicato)"}</dd>
            <dt>Operatore</dt><dd>{d.contract.supplier ?? "n.d."}</dd>
            <dt>Netto / IVA / lordo</dt><dd><Euro v={d.contract.net} /> + <Euro v={d.contract.vat} /> = <strong><Euro v={d.contract.gross} /></strong></dd>
            <dt>Differenza dal programmato</dt><dd>{formatEuro(ev.programmed)} programmato</dd>
            <dt>Stipula / decorrenza / fine</dt><dd><DateIt v={d.contract.signedDate} /> · <DateIt v={d.contract.startDate} /> · <DateIt v={d.contract.endDate} /></dd>
          </dl>
        ) : <p className="muted">Contratto non ancora registrato.</p>}
      </section>
      <section className="card" data-tour="sal">
        <h2>Piano SAL e pagamenti</h2>
        {d.sals.length ? (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>SAL</th><th className="num">%</th><th className="num">Importo</th><th>Stato</th><th>Scadenza</th><th className="num">Accettato</th><th className="num">Liquidato</th><th className="num">Pagato</th><th>Azioni</th></tr></thead>
              <tbody>
                {d.sals.map((s) => (
                  <tr key={s.seq}>
                    <td>SAL {s.seq}</td>
                    <td className="num">{s.pct.replace(".", ",")}</td>
                    <td className="num"><Euro v={s.amount} /></td>
                    <td><SalBadge state={s.state} overdue={s.overdue} /></td>
                    <td><DateIt v={s.state === "PLANNED" ? s.dueDate : s.state === "SUBMITTED" || s.state === "UNDER_REVIEW" ? s.reviewDueDate : s.paymentDueDate} /></td>
                    <td className="num"><Euro v={s.accepted} /></td>
                    <td className="num"><Euro v={s.liquidated} /></td>
                    <td className="num"><Euro v={s.paid} /></td>
                    <td><SalActions d={d} s={s} actor={actor} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={2}>Totale</td><td className="num"><Euro v={d.contract?.gross ?? ev.programmed} /></td><td colSpan={4}></td><td className="num"><Euro v={ev.paid} /></td><td>Residuo <Euro v={ev.residual} /></td></tr></tfoot>
            </table>
          </div>
        ) : <p className="muted">Piano SAL non disponibile (nei dati del workbook gli importi sono solo annuali).</p>}
      </section>
      {!d.supplierView ? (
        <>
          <section className="card">
            <h2>Annualità: fabbisogno e disponibilità</h2>
            <AnnualChart rows={ev.years} />
          </section>
          <section className="card" data-tour="movimenti">
            <h2>Righe di previsione e movimenti</h2>
            <div className="grid grid-2">
              <table className="data">
                <caption>Previsione di pagamento (versione corrente)</caption>
                <thead><tr><th>Data</th><th className="num">Importo</th><th>Ancora</th></tr></thead>
                <tbody>{d.forecastLines.map((l) => <tr key={l.id}><td><DateIt v={l.date} /></td><td className="num"><Euro v={l.amount} /></td><td>{l.anchor}</td></tr>)}</tbody>
              </table>
              <table className="data">
                <caption>Movimenti finanziari (append-only)</caption>
                <thead><tr><th>Data</th><th>Tipo</th><th className="num">Importo</th><th>Rif.</th></tr></thead>
                <tbody>{d.movements.map((m) => <tr key={m.id}><td><DateIt v={m.date} /></td><td>{MOVEMENT_LABEL[m.type] ?? m.type}</td><td className="num"><Euro v={m.amount} /></td><td className="small">{m.reference}</td></tr>)}</tbody>
              </table>
            </div>
            {d.payments.length ? (
              <table className="data" style={{ marginTop: 12 }}>
                <caption>Pagamenti</caption>
                <thead><tr><th>Data</th><th>SAL</th><th className="num">Importo</th><th>Riferimento</th><th>Stato</th>{can(actor, "finance.record") ? <th>Azioni</th> : null}</tr></thead>
                <tbody>
                  {d.payments.map((x) => (
                    <tr key={x.id}>
                      <td><DateIt v={x.date} /></td><td>{x.sal}</td><td className="num"><Euro v={x.amount} /></td><td>{x.reference ?? "—"}</td><td>{x.state === "REVERSED" ? "Stornato" : "Eseguito"}</td>
                      {can(actor, "finance.record") ? (
                        <td>{x.state !== "REVERSED" ? <ActionForm endpoint={`/api/payments/${x.id}/reverse`} submitLabel="Storna" variant="ghost" confirm="Confermi lo storno del pagamento? Resterà visibile insieme all'originale." fields={[{ name: "reason", label: "Motivo dello storno", type: "textarea", required: true }]} successMessage="Pagamento stornato." /> : null}</td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

function SalActions({ d, s, actor }: { d: ReturnType<typeof procedureDetail>; s: ReturnType<typeof procedureDetail>["sals"][number]; actor: Parameters<typeof can>[0] }) {
  if (!d.contract?.signed) return <span className="muted small">contratto non stipulato</span>;
  const base = `/api/procedures/${d.procedure.code}/sals/${s.seq}`;
  const date = { name: "date", label: "Data", type: "date" as const, required: true, defaultValue: d.referenceDate };
  if ((s.state === "PLANNED" || s.state === "REJECTED") && can(actor, "sal.submit")) return <ActionForm endpoint={`${base}/transition`} submitLabel="Presenta SAL" fields={[{ name: "to", label: "Stato", type: "select", options: [{ value: "SUBMITTED", label: "Presentato" }] }, date]} />;
  if ((s.state === "SUBMITTED" || s.state === "UNDER_REVIEW") && (can(actor, "sal.accept") || can(actor, "sal.verify")))
    return (
      <ActionForm
        endpoint={`${base}/transition`}
        submitLabel="Registra esito verifica"
        fields={[{ name: "to", label: "Esito", type: "select", options: [...(can(actor, "sal.accept") ? [{ value: "ACCEPTED", label: "Accettato" }] : []), ...(can(actor, "sal.verify") && s.state === "SUBMITTED" ? [{ value: "UNDER_REVIEW", label: "In verifica" }] : []), { value: "REJECTED", label: "Rigettato" }] }, date, { name: "note", label: "Nota o motivo", type: "textarea", required: true }]}
      />
    );
  if (s.state === "ACCEPTED" && can(actor, "finance.record")) return <ActionForm endpoint={`${base}/transition`} submitLabel="Registra fattura" fields={[{ name: "to", label: "Stato", type: "select", options: [{ value: "INVOICED", label: "Fatturato" }] }, date]} />;
  if (s.state === "INVOICED" && can(actor, "finance.record")) return <ActionForm endpoint={`${base}/liquidations`} submitLabel="Liquida" fields={[{ name: "amount", label: "Importo", type: "amount", required: true, defaultValue: (s.amount ?? "").replace(".", ",") }, date]} />;
  if ((s.state === "LIQUIDATED" || s.state === "PARTIALLY_PAID") && can(actor, "finance.record"))
    return <ActionForm endpoint={`${base}/payments`} submitLabel="Registra pagamento" fields={[{ name: "amount", label: "Importo", type: "amount", required: true, defaultValue: s.payable.replace(".", ","), help: `Liquidato non pagato: ${formatEuro(s.payable)}` }, date, { name: "reference", label: "Riferimento mandato (facoltativo)" }]} successMessage="Pagamento registrato." />;
  return <span className="muted small">—</span>;
}

