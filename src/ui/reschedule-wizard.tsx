"use client";
import Link from "next/link";
import { useState } from "react";
import { formatDateIt, formatEuro } from "@/contracts/format";
import { api } from "./api-client";

interface Sim {
  source_milestone: string;
  candidate_date: string;
  date_changes: number;
  changes: { code: string; before: string; after: string; deltaDays: number }[];
  line_changes: { id: string; before: string; after: string; amount: string; yearChanged: boolean }[];
  amount_shifted: string;
  need_before: Record<string, string>;
  need_after: Record<string, string>;
  annual_impact: Record<string, string>;
  criticalities: { code: string; severity: string; year?: number; amount?: string; message: string }[];
}
interface Alt {
  kind: string;
  sameAs: string | null;
  explanation: string;
  result: Sim;
}

const STEPS = ["Causa", "Cronoprogramma", "Finanza", "Alternative", "Decisione"];
const KIND_LABEL: Record<string, string> = { FASTEST: "Più rapida", MIN_ANNUAL_IMPACT: "Minore impatto annuale", MANUAL: "Proposta manuale" };

/** Wizard a 5 passi (spec §9.4, 07 §6.9): l'anteprima non modifica alcun dato; il salvataggio crea una bozza. */
export function RescheduleWizard(props: {
  code: string;
  referenceDate: string;
  defaultSource: string;
  fastest: string | null;
  milestones: { code: string; label: string; forecast: string | null; baseline: string | null; state: string }[];
  allMilestones: { code: string; label: string; forecast: string | null; baseline: string | null; actual: string | null }[];
  years: { year: number; need: string; available: string | null; baseline: string | null }[];
  rescheduleRequired: boolean;
}) {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState(props.defaultSource);
  const [candidate, setCandidate] = useState(props.fastest ?? props.referenceDate);
  const [cause, setCause] = useState(props.defaultSource === "MEMORY_SUBMISSION" ? "MEMORY_OVERDUE" : "MILESTONE_OVERDUE");
  const [notes, setNotes] = useState("");
  const [alts, setAlts] = useState<Alt[] | null>(null);
  const [chosen, setChosen] = useState<string>("MANUAL");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const label = (c: string) => props.allMilestones.find((m) => m.code === c)?.label ?? c;
  const current = alts?.find((a) => a.kind === chosen) ?? alts?.find((a) => a.kind === "MANUAL") ?? null;

  async function compute() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ alternatives: Alt[] }>(`/api/procedures/${props.code}/reschedules/alternatives?source=${source}&candidate=${candidate}`, "GET");
      setAlts(r.alternatives);
      setChosen("MANUAL");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function save(submit: boolean) {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ simulation_id: string }>(`/api/procedures/${props.code}/reschedules/simulate`, "POST", {
        source_milestone: source,
        candidate_date: current.result.candidate_date,
        cause,
        kind: current.kind,
        notes,
      });
      if (submit) await api(`/api/reschedules/${r.simulation_id}/submit`, "POST", {});
      setSaved(r.simulation_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  const years = [...new Set([...props.years.map((y) => String(y.year)), ...Object.keys(current?.result.need_after ?? {})])].sort();
  const avail = (y: string) => props.years.find((x) => String(x.year) === y)?.available ?? null;

  return (
    <div>
      <ol className="stepper" aria-label="Passaggi della riprogrammazione">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} data-state={i < step ? "done" : undefined}>
            <span className="n">{i < step ? "✓" : i + 1}</span>
            <button className="linkbtn" style={{ textDecoration: "none", color: "inherit" }} disabled={!alts && i > 0} onClick={() => setStep(i)}>
              {s}
            </button>
            <span className="sr-only">{i < step ? "completato" : i === step ? "corrente" : "da fare"}</span>
          </li>
        ))}
      </ol>
      {error ? <div className="alert-box error" role="alert">{error}</div> : null}
      {saved ? (
        <div className="alert-box success" role="status">
          Simulazione {saved} salvata. Nessun dato corrente è stato modificato: la nuova previsione diventa effettiva solo dopo l'approvazione.{" "}
          <Link href={`/procedure/${props.code}?tab=simulations`}>Vai alle simulazioni</Link>
        </div>
      ) : null}

      {step === 0 ? (
        <section className="card grid grid-2">
          <div className="stack">
            <h2>1. Causa</h2>
            {props.rescheduleRequired ? <div className="alert-box warning">Milestone bloccante scaduta: la riprogrammazione è richiesta (BR-004).</div> : null}
            <div className="field">
              <label htmlFor="src">Milestone da spostare</label>
              <select id="src" value={source} onChange={(e) => setSource(e.target.value)}>
                {props.milestones.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label} (prevista {formatDateIt(m.forecast)})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cause">Causa</label>
              <select id="cause" value={cause} onChange={(e) => setCause(e.target.value)}>
                <option value="MEMORY_OVERDUE">Memoria non presentata nei termini</option>
                <option value="MILESTONE_OVERDUE">Milestone scaduta</option>
                <option value="DOCUMENT_MISSING">Documento o garanzia mancante</option>
                <option value="PLAN_CHANGE">Modifica del Piano di attuazione</option>
                <option value="OTHER">Altro</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="cand">Nuova data proposta (obbligatorio)</label>
              <input id="cand" type="date" value={candidate} min={props.referenceDate} onChange={(e) => setCandidate(e.target.value)} />
              <span className="help">Data più rapida ammissibile: {props.fastest ? formatDateIt(props.fastest) : "n.d."} (riferimento + preavviso minimo, giorno lavorativo).</span>
            </div>
            <div className="field">
              <label htmlFor="notes">Note e vincoli (facoltativo)</label>
              <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <div>
            <h3>Cosa succede</h3>
            <p className="muted">Il motore deterministico sposta la milestone e le successive non completate, rispetta durate minime e calendario, ricalcola SAL, pagamenti e annualità e confronta il fabbisogno con la disponibilità. Le date effettive non cambiano.</p>
          </div>
        </section>
      ) : null}

      {step === 1 && current ? (
        <section className="card">
          <h2>2. Cronoprogramma ({current.result.date_changes} date cambiate)</h2>
          <table className="data">
            <thead><tr><th>Milestone</th><th>Baseline</th><th>Previsione attuale</th><th>Simulazione</th><th className="num">Delta</th></tr></thead>
            <tbody>
              {props.allMilestones.map((m) => {
                const ch = current.result.changes.find((c) => c.code === m.code);
                return (
                  <tr key={m.code}>
                    <td>{m.label}</td>
                    <td>{formatDateIt(m.baseline)}</td>
                    <td>{m.actual ? <>effettiva {formatDateIt(m.actual)}</> : formatDateIt(m.forecast)}</td>
                    <td>{ch ? <strong>{formatDateIt(ch.after)}</strong> : <span className="muted">invariata</span>}</td>
                    <td className="num">{ch ? `${ch.deltaDays > 0 ? "+" : ""}${ch.deltaDays} gg` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {step === 2 && current ? (
        <section className="card">
          <h2>3. Finanza</h2>
          <p>Importo che cambia annualità: <strong>{formatEuro(current.result.amount_shifted)}</strong></p>
          <table className="data">
            <thead><tr><th>Anno</th><th className="num">Fabbisogno attuale</th><th className="num">Fabbisogno simulato</th><th className="num">Variazione</th><th className="num">Disponibilità</th><th>Esito</th></tr></thead>
            <tbody>
              {years.map((y) => {
                const after = current.result.need_after[y] ?? "0.00";
                const over = current.result.criticalities.find((c) => c.code === "BUDGET_OVERFLOW" && String(c.year) === y);
                return (
                  <tr key={y}>
                    <th scope="row">{y}</th>
                    <td className="num">{formatEuro(current.result.need_before[y] ?? "0.00")}</td>
                    <td className="num">{formatEuro(after)}</td>
                    <td className="num">{current.result.annual_impact[y] ? formatEuro(current.result.annual_impact[y]) : "—"}</td>
                    <td className="num">{formatEuro(avail(y))}</td>
                    <td>{over ? <span className="badge badge-RED">Eccedenza {formatEuro(over.amount)}</span> : <span className="badge badge-GREEN">Coperto</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {current.result.line_changes.length ? (
            <>
              <h3 style={{ marginTop: 12 }}>Pagamenti spostati</h3>
              <ul>{current.result.line_changes.map((l) => <li key={l.id}>{formatEuro(l.amount)}: {formatDateIt(l.before)} → {formatDateIt(l.after)}{l.yearChanged ? " (cambia annualità)" : ""}</li>)}</ul>
            </>
          ) : null}
        </section>
      ) : null}

      {step === 3 && alts ? (
        <section className="card">
          <h2>4. Alternative</h2>
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend className="sr-only">Scegli l'alternativa</legend>
            <div className="grid grid-3">
              {alts.map((a) => (
                <label key={a.kind} className="card" style={{ cursor: "pointer", borderColor: chosen === a.kind ? "var(--brand-blue)" : undefined, borderWidth: chosen === a.kind ? 2 : 1 }}>
                  <input type="radio" name="alt" value={a.kind} checked={chosen === a.kind} onChange={() => setChosen(a.kind)} /> <strong>{KIND_LABEL[a.kind]}</strong>
                  {a.sameAs ? <span className="small muted"> — coincide con «{KIND_LABEL[a.sameAs]}»</span> : null}
                  <dl className="kv" style={{ marginTop: 8 }}>
                    <dt>Data</dt><dd>{formatDateIt(a.result.candidate_date)}</dd>
                    <dt>Date cambiate</dt><dd>{a.result.date_changes}</dd>
                    <dt>Spostato</dt><dd>{formatEuro(a.result.amount_shifted)}</dd>
                    <dt>Criticità</dt><dd>{a.result.criticalities.length ? a.result.criticalities.map((c, i) => <div key={i} className={`badge ${c.severity === "BLOCKING" ? "badge-RED" : "badge-AMBER"}`}>{c.severity === "BLOCKING" ? "Bloccante" : "Avvertenza"}: {c.message}</div>) : "nessuna"}</dd>
                  </dl>
                  <p className="small muted">{a.explanation}</p>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
      ) : null}

      {step === 4 && current ? (
        <section className="card stack">
          <h2>5. Decisione</h2>
          <p>
            Alternativa <strong>{KIND_LABEL[current.kind]}</strong>: {label(source)} al {formatDateIt(current.result.candidate_date)}, {current.result.date_changes} date cambiate, {formatEuro(current.result.amount_shifted)} spostati tra annualità.
          </p>
          {current.result.criticalities.some((c) => c.severity === "BLOCKING") ? (
            <div className="alert-box error">Sono presenti criticità bloccanti: l'approvazione richiederà un override motivato del Direttore Generale.</div>
          ) : (
            <div className="alert-box success">Nessuna criticità bloccante.</div>
          )}
          <p className="muted">Il salvataggio crea una simulazione in bozza; l'invio la sottopone all'approvazione. Chi propone non può approvare (quattro occhi).</p>
          <div className="actions">
            <button className="btn btn-secondary" disabled={busy || !!saved} onClick={() => save(false)}>Salva bozza</button>
            <button className="btn btn-primary" disabled={busy || !!saved} onClick={() => save(true)} aria-busy={busy}>{busy ? "Invio in corso…" : "Invia ad approvazione"}</button>
          </div>
        </section>
      ) : null}

      <div className="sticky-actions">
        <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Indietro</button>
        {step === 0 ? (
          <button className="btn btn-primary" onClick={compute} disabled={busy || !source || !candidate} aria-busy={busy}>{busy ? "Calcolo in corso…" : "Calcola simulazione"}</button>
        ) : step < 4 ? (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Avanti</button>
        ) : <span />}
      </div>
    </div>
  );
}
