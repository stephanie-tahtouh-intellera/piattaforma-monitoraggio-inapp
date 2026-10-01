import Link from "next/link";
import { can } from "@/server/authz";
import { validationQueue } from "@/server/queries";
import { db, pageActor, sp } from "@/server/page";
import { ActionForm } from "@/ui/action-form";

export const metadata = { title: "Coda di validazione" };
const KIND: Record<string, string> = {
  ASSOCIATION: "Associazione documento",
  EXTRACTED_FIELD: "Campo estratto",
  CONFLICT: "Conflitto",
  OVERRIDE: "Override",
  RESCHEDULE: "Proposta di riprogrammazione",
};

export default async function ValidationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await pageActor();
  const status = sp((await searchParams).status) ?? "OPEN";
  const items = validationQueue(db(), actor, status) as any[];
  const canDecide = can(actor, "validation.decide");
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Coda di validazione</h1>
          <div className="page-meta">Proposte da estrazioni, associazioni e workbook: nessun valore estratto sovrascrive un validato (BR-015).</div>
        </div>
      </div>
      <nav className="tabs" aria-label="Stato">
        {[["OPEN", "Da decidere"], ["APPROVED", "Approvate"], ["CORRECTED", "Corrette"], ["REJECTED", "Rifiutate"]].map(([k, l]) => (
          <Link key={k} href={`/validazione?status=${k}`} aria-current={status === k ? "page" : undefined}>
            {l}
          </Link>
        ))}
      </nav>
      <div className="table-wrap">
        <table className="data">
          <caption className="sr-only">Elementi in coda</caption>
          <thead>
            <tr><th>Procedura</th><th>Tipo</th><th>Campo</th><th>Proposto</th><th>Validato attuale</th><th>Fonte</th><th className="num">Affidabilità</th><th>Decisione</th></tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id}>
                <td className="mono"><Link href={`/procedure/${v.procedure_code}?tab=documents`}>{v.procedure_code}</Link></td>
                <td>{v.kind === "CONFLICT" ? <span className="badge badge-AMBER">In conflitto</span> : (KIND[v.kind] ?? v.kind)}</td>
                <td className="mono small">{v.field}</td>
                <td><strong>{v.proposed_value}</strong></td>
                <td>{v.current_value ?? "—"}</td>
                <td className="small">
                  {v.file_name ?? "workbook"}
                  {v.locator ? ` · ${v.locator}` : ""}
                  {v.excerpt ? <div className="muted">«{v.excerpt}»</div> : null}
                  <div className="muted">metodo {v.method}</div>
                </td>
                <td className="num">{v.confidence}</td>
                <td>
                  {status === "OPEN" && canDecide ? (
                    <div className="stack">
                      <ActionForm endpoint={`/api/validations/${v.id}/decide`} submitLabel="Approva" inline variant="secondary" fields={[{ name: "outcome", label: "Esito", type: "select", options: [{ value: "APPROVED", label: "Approva la proposta" }] }]} />
                      <ActionForm
                        endpoint={`/api/validations/${v.id}/decide`}
                        submitLabel="Correggi"
                        variant="ghost"
                        fields={[
                          { name: "outcome", label: "Esito", type: "select", options: [{ value: "CORRECTED", label: "Correggi" }] },
                          { name: "value", label: "Valore corretto", required: true, defaultValue: v.current_value ?? "" },
                          { name: "note", label: "Motivazione", type: "textarea", required: true, help: "Comparirà nell'audit con prima/dopo" },
                        ]}
                      />
                      <ActionForm
                        endpoint={`/api/validations/${v.id}/decide`}
                        submitLabel="Rifiuta"
                        variant="ghost"
                        fields={[
                          { name: "outcome", label: "Esito", type: "select", options: [{ value: "REJECTED", label: "Rifiuta" }] },
                          { name: "note", label: "Motivazione", type: "textarea", required: true },
                        ]}
                      />
                    </div>
                  ) : v.decided_by ? (
                    <span className="small">
                      {v.status} da {v.decided_by}
                      {v.decision_value ? ` → ${v.decision_value}` : ""}
                      {v.note ? ` — «${v.note}»` : ""}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td colSpan={8} className="muted">Nessun elemento.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
