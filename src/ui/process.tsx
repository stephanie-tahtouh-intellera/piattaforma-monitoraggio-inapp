import Link from "next/link";
import { formatEuro } from "@/contracts/format";
import type { procedureDetail } from "@/server/queries";
import { ActionForm, type FieldDef } from "./action-form";
import { DateIt } from "./badges";
import { UploadForm } from "./upload-form";
import { DOC_TYPE_LABEL, LANES, OWNER_LABEL, STAGES, humanize } from "./labels";

type Detail = Awaited<ReturnType<typeof procedureDetail>>;
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

/** Un riquadro con `href` è un'azione che l'utente può fare ora: porta al modulo corrispondente nella pagina. */
function StepLink({ href, label, children }: { href?: string | undefined; label: string; children: React.ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <a className="step-link" href={href} aria-label={`Vai al modulo: ${label}`}>
      {children}
      <span className="step-cta" aria-hidden>Vai al modulo →</span>
    </a>
  );
}

function StepCard({ s, docTypes, href }: { s: Step; docTypes: Set<string>; href?: string | undefined }) {
  const cls = s.actual ? "step done" : s.active ? `step active${s.state === "OVERDUE" ? " overdue" : ""}` : "step";
  return (
    <StepLink href={href} label={s.label}>
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
              {docTypes.has(d.type) ? "✓" : "○"} {DOC_TYPE_LABEL[d.type] ?? humanize(d.type)}
            </li>
          ))}
        </ul>
      ) : null}
      {s.active ? <div className="step-turn">Tocca a: {OWNER_LABEL[s.owner] ?? s.owner}</div> : null}
    </div>
    </StepLink>
  );
}

/** Destinazione del riquadro: la consegna della memoria per la bozza, il modulo del passo in corso per gli altri. */
function stepHref(s: Step, draft: boolean, canSubmitMemory: boolean) {
  if (draft) return s.code === "MEMORY_SUBMISSION" && canSubmitMemory ? "#memoria" : undefined;
  return s.active && s.canComplete ? "#passo" : undefined;
}

/** Vista a corsie della singola procedura (schema di processo INAPP, Modulo 1). */
export function IterBoard({ d, canSubmitMemory = false, canUpload = false }: { d: Detail; canSubmitMemory?: boolean; canUpload?: boolean }) {
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
                        <StepLink href={draft && canSubmitMemory ? "#memoria" : undefined} label="Consegna della memoria">
                          <div className={draft ? "step active" : "step done"}>
                            <div className="step-title">Inserimento nel piano di programmazione</div>
                            <div className="step-meta">{draft ? "Bozza in corso" : "Nel piano"}</div>
                            {draft ? <div className="step-turn">Tocca a: Struttura</div> : null}
                          </div>
                        </StepLink>
                      ) : null}
                      {steps.map((s) => (
                        <StepCard key={s.code} s={s} docTypes={docTypes} href={stepHref(s, draft, canSubmitMemory)} />
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
      <StepPanel d={d} canUpload={canUpload} />
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
export function StepPanel({ d, canUpload = false }: { d: Detail; canUpload?: boolean }) {
  const s = d.timeline.find((t) => t.active);
  if (d.evaluation.status === "DRAFT") return null;
  if (!s) {
    return <div className="step-panel done" data-tour="passo">Tutti i passi del Modulo 1 sono completati: il contratto è stipulato.</div>;
  }
  return (
    <div className="step-panel" id="passo" data-tour="passo">
      <h3>
        Passo in corso: {s.label}
      </h3>
      <p className="small">
        Tocca a <strong>{OWNER_LABEL[s.owner] ?? s.owner}</strong>
        {s.forecast ? <> · entro il <DateIt v={s.forecast} /></> : null}
        {s.blocked && s.blockerReason ? <> · <span className="badge badge-AMBER">{s.blockerReason}</span></> : null}
      </p>
      {s.canComplete && canUpload && s.expectedDocuments.length ? (
        <div className="step-upload" data-tour="upload-passo">
          <h4>1. Carica i documenti</h4>
          <p className="small muted">
            Documenti attesi: {s.expectedDocuments.map((x) => DOC_TYPE_LABEL[x.type] ?? humanize(x.type)).join(", ")}. I file sono controllati per tipo, firma del contenuto e dimensione.
          </p>
          <UploadForm code={d.procedure.code} />
          <h4>2. Registra il passo</h4>
        </div>
      ) : null}
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
