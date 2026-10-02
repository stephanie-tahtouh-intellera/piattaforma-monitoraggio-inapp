import Link from "next/link";
import { formatEuro } from "@/contracts/format";
import type { procedureDetail } from "@/server/queries";
import { ActionForm, type FieldDef } from "./action-form";
import { DateIt } from "./badges";
import { LANES, OWNER_LABEL, STAGES } from "./labels";

type Detail = ReturnType<typeof procedureDetail>;
type Step = Detail["timeline"][number];

/** Barra delle fasi dello schema di processo; il Modulo 2 compare solo se attivo (DEC-108). */
export function PhaseBar({ stage, module2, signed }: { stage: number | null; module2: boolean; signed: boolean }) {
  const stages = STAGES.filter((s) => module2 || s.module === 1);
  const current = stage !== null && !module2 && stage > 3 ? null : stage;
  return (
    <ol className="phase-bar" aria-label="Fasi del processo">
      {stages.map((s) => {
        const done = (current !== null && s.n < current) || (!module2 && signed && stage !== null && stage > 3);
        const here = current === s.n;
        return (
          <li key={s.n} className={here ? "is-current" : done ? "is-done" : undefined} aria-current={here ? "step" : undefined}>
            <strong>
              {s.n}. {s.title}
            </strong>
            <span>{s.sub}</span>
            <span className="sr-only">{here ? " – fase corrente" : done ? " – completata" : ""}</span>
          </li>
        );
      })}
      {!module2 && signed && stage !== null && stage > 3 ? (
        <li className="is-end">
          <strong>Contratto stipulato</strong>
          <span>fine del Modulo 1</span>
        </li>
      ) : null}
    </ol>
  );
}

function StepCard({ s, docTypes }: { s: Step; docTypes: Set<string> }) {
  const cls = s.actual ? "step done" : s.active ? `step active${s.state === "OVERDUE" ? " overdue" : ""}` : "step";
  return (
    <div className={cls}>
      <div className="step-title">
        {s.key ? <span className="key-mark" title="Data chiave" aria-label="Data chiave">◆</span> : null}
        {s.label}
      </div>
      <div className="step-meta">
        {s.actual ? (
          <>Fatto il <DateIt v={s.actual} /></>
        ) : s.active ? (
          <>{s.state === "OVERDUE" ? "Scaduto il" : "In corso · entro il"} <DateIt v={s.forecast} /></>
        ) : (
          <>Previsto il <DateIt v={s.forecast} /></>
        )}
      </div>
      {s.expectedDocuments.length ? (
        <ul className="step-docs">
          {s.expectedDocuments.map((d) => (
            <li key={d.type}>
              {docTypes.has(d.type) ? "✓" : "○"} {d.type.replace(/_/g, " ").toLowerCase()}
            </li>
          ))}
        </ul>
      ) : null}
      {s.active ? <div className="step-turn">Tocca a: {OWNER_LABEL[s.owner] ?? s.owner}</div> : null}
    </div>
  );
}

/** Vista a corsie della singola procedura (schema di processo INAPP, Modulo 1). */
export function IterBoard({ d }: { d: Detail }) {
  const module2 = d.process.module2;
  const stages = STAGES.filter((s) => s.module === 1 || module2);
  const docTypes = new Set((d.documents as { doc_type: string | null }[]).map((x) => x.doc_type ?? ""));
  const draft = d.evaluation.status === "DRAFT";
  const key = d.timeline.filter((t) => t.key);
  return (
    <section className="card" aria-labelledby="iter-h">
      <h2 id="iter-h">Iter della procedura</h2>
      <p className="muted small">
        Ogni riquadro è un passo dello schema di processo, nella corsia di chi lo esegue. Il passo in corso è evidenziato; ◆ indica una data chiave.
        {d.process.operator ? <> Operatore economico: <strong>{d.process.operator.name}</strong>.</> : null}
      </p>
      <div className="table-wrap">
        <table className="iter-board">
          <caption className="sr-only">Passi della procedura per corsia e fase</caption>
          <thead>
            <tr>
              <th scope="col">Corsia</th>
              {stages.map((s) => (
                <th scope="col" key={s.n} className={d.process.stage === s.n ? "is-current" : undefined}>
                  {s.n}. {s.title} <span>{s.sub}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LANES.map((lane) => (
              <tr key={lane.owner}>
                <th scope="row">{lane.label}</th>
                {stages.map((st) => {
                  const steps = d.timeline.filter((t) => t.owner === lane.owner && t.stage === st.n);
                  const plan = st.n === 0 && lane.owner === "STRUCTURE";
                  return (
                    <td key={st.n}>
                      {plan ? (
                        <div className={draft ? "step active" : "step done"}>
                          <div className="step-title">Inserimento nel piano di programmazione</div>
                          <div className="step-meta">{draft ? "Bozza in corso" : "Nel piano"}</div>
                          {draft ? <div className="step-turn">Tocca a: Struttura</div> : null}
                        </div>
                      ) : null}
                      {steps.map((s) => (
                        <StepCard key={s.code} s={s} docTypes={docTypes} />
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {key.length ? (
        <>
          <h3 style={{ marginTop: 16 }}>Date chiave da programmate a effettive</h3>
          <table className="data">
            <thead><tr><th>Data chiave</th><th>Baseline</th><th>Prevista</th><th>Effettiva</th></tr></thead>
            <tbody>
              {key.map((k) => (
                <tr key={k.code}>
                  <td>{k.label}</td>
                  <td><DateIt v={k.baseline} /></td>
                  <td><DateIt v={k.forecast} /></td>
                  <td>{k.actual ? <DateIt v={k.actual} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      <StepPanel d={d} />
    </section>
  );
}

/** Importo proposto nel modulo in formato italiano (es. "244.000,00"); il form lo riconverte. */
const amountIt = (v: string) => formatEuro(v).replace(/\s*€/, "");

function stepFields(d: Detail, s: Step): FieldDef[] {
  const date: FieldDef = { name: "date", label: "Data effettiva", type: "date", required: true, defaultValue: d.referenceDate };
  const note: FieldDef = { name: "note", label: s.action === "SIGN" ? "Riferimento dell'ordine o del contratto" : "Nota o riferimento all'atto", type: "textarea" };
  const suppliers = d.process.suppliers.map((x) => ({ value: x.code, label: x.name }));
  const opDefault = d.process.operator?.code;
  const years = d.evaluation.years.map((y) => y.year);
  const reserved = new Map(d.process.reservations.map((r) => [r.year, r.amount]));
  switch (s.action) {
    case "OPERATOR":
      return [{ name: "operator", label: s.code === "EVALUATION_COMPLETED" ? "Aggiudicatario individuato" : "Operatore economico a cui richiedere i documenti", type: "select", options: suppliers, ...(opDefault ? { defaultValue: opDefault } : {}) }, date, note];
    case "RESERVATIONS":
      return [...years.map((y) => ({ name: `lines.${y}`, label: `Prenotazione ${y}`, type: "amount" as const, defaultValue: amountIt(d.evaluation.years.find((x) => x.year === y)?.need ?? "0.00") })), date, { ...note, label: "Fonte di finanziamento e riferimento" }];
    case "COMMITMENTS":
      return [...years.map((y) => ({ name: `lines.${y}`, label: `Impegno ${y}`, type: "amount" as const, defaultValue: amountIt(reserved.get(y) ?? d.evaluation.years.find((x) => x.year === y)?.need ?? "0.00") })), date, note];
    case "AWARD":
      return [
        { name: "operator", label: "Operatore aggiudicatario", type: "select", options: suppliers, ...(opDefault ? { defaultValue: opDefault } : {}) },
        { name: "gross", label: "Importo di aggiudicazione IVA inclusa", type: "amount", required: true, defaultValue: amountIt(d.evaluation.programmed), help: "Netto e IVA sono calcolati con l'aliquota del 22% (DA VALIDARE)." },
        { name: "start_date", label: "Inizio attività", type: "date" },
        { name: "end_date", label: "Fine attività", type: "date" },
        date,
        note,
      ];
    default:
      return [date, note];
  }
}

/** Pannello del passo in corso: chi deve agire e, se tocca all'utente, il modulo di registrazione. */
export function StepPanel({ d }: { d: Detail }) {
  const s = d.timeline.find((t) => t.active);
  if (d.evaluation.status === "DRAFT") return null;
  if (!s) {
    return <div className="step-panel done" data-tour="passo">Tutti i passi del Modulo 1 sono completati: il contratto è stipulato.</div>;
  }
  return (
    <div className="step-panel" data-tour="passo">
      <h3>
        Passo in corso: {s.label}
      </h3>
      <p className="small">
        Tocca a <strong>{OWNER_LABEL[s.owner] ?? s.owner}</strong>
        {s.forecast ? <> · entro il <DateIt v={s.forecast} /></> : null}
        {s.blocked && s.blockerReason ? <> · <span className="badge badge-AMBER">{s.blockerReason}</span></> : null}
      </p>
      {s.canComplete ? (
        <ActionForm
          endpoint={`/api/procedures/${d.procedure.code}/milestones/${s.code}/complete`}
          submitLabel={s.action === "SIGN" ? "Accetto l'ordine e controfirmo il contratto" : "Registra il passo"}
          fields={stepFields(d, s)}
          successMessage="Passo registrato: il processo passa al passo successivo."
        />
      ) : (
        <p className="muted small">
          Il passo è registrato da {OWNER_LABEL[s.owner] ?? s.owner}
          {s.owner === "SUPPLIER" && !d.process.operator ? " (operatore non ancora individuato)" : ""}. <Link href="/guida">Vedi la guida demo</Link>
        </p>
      )}
    </div>
  );
}
