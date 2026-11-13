import { Inbox } from "lucide-react";
import Link from "next/link";
import { formatDateTimeIt } from "@/contracts/format";
import { ActionForm } from "./action-form";
import { DateIt, SeverityBadge } from "./badges";
import { ALERT_STATUS_LABEL, AUDIT_ACTION_LABEL, ENTITY_LABEL, OWNER_LABEL, RULE_LABEL, humanize } from "./labels";

export function AlertTable({ alerts, canHandle, canSuspend, showProcedure = false }: { alerts: any[]; canHandle: boolean; canSuspend: boolean; showProcedure?: boolean }) {
  // Ruoli di sola consultazione (Direttore Generale, DEC-122): niente colonna "Azioni" invece di una colonna vuota.
  const showActions = canHandle || canSuspend;
  const columns = (showProcedure ? 1 : 0) + 7 + (showActions ? 1 : 0);
  return (
    <div className="table-wrap">
      <table className="data alerts-table">
        <colgroup>
          {showProcedure ? <col className="c-proc" /> : null}
          <col className="c-kind" /><col className="c-rule" /><col className="c-sev" /><col className="c-level" /><col className="c-due" /><col className="c-state" /><col className="c-owner" />{showActions ? <col className="c-actions" /> : null}
        </colgroup>
        <thead><tr>{showProcedure ? <th>Procedura</th> : null}<th>Tipo</th><th>Regola</th><th>Severità</th><th>Livello</th><th>Scadenza</th><th>Stato</th><th>Owner</th>{showActions ? <th>Azioni</th> : null}</tr></thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              {showProcedure ? <td><Link className="mono" href={`/procedure/${a.procedure_code}?tab=alerts`}>{a.procedure_code}</Link><div className="small muted clamp2" title={a.procedure_title}>{a.procedure_title}</div></td> : null}
              <td>{a.kind === "ANOMALY" ? "Anomalia" : "Alert"}</td>
              <td>{RULE_LABEL[a.rule] ?? humanize(a.rule)}<div className="small muted">{a.title}{a.message && a.message !== a.title ? ` — ${a.message}` : ""}</div></td>
              <td><SeverityBadge value={a.severity} /></td>
              <td>{a.current_level ?? "—"}</td>
              <td><DateIt v={a.due_date} /></td>
              <td>{ALERT_STATUS_LABEL[a.status] ?? a.status}{a.acknowledged_by ? <div className="small muted">in carico a {a.acknowledged_by}</div> : null}{a.resolution_note ? <div className="small muted">«{a.resolution_note}»</div> : null}</td>
              <td>{OWNER_LABEL[a.owner] ?? a.owner ?? "—"}</td>
              {showActions ? (
              <td>
                {["OPEN", "ACKNOWLEDGED", "SUSPENDED"].includes(a.status) && canHandle ? (
                  <div className="stack">
                    {a.status === "OPEN" ? <ActionForm endpoint={`/api/alerts/${a.id}/acknowledge`} submitLabel="Prendi in carico" inline variant="secondary" /> : null}
                    <ActionForm endpoint={`/api/alerts/${a.id}/resolve`} submitLabel="Risolvi" variant="ghost" fields={[{ name: "note", label: "Nota di risoluzione", type: "textarea", required: true, help: "La risoluzione non modifica milestone o finanza." }]} />
                  </div>
                ) : null}
                {a.status === "OPEN" && a.kind === "ALERT" && canSuspend ? (
                  <ActionForm endpoint={`/api/alerts/${a.id}/suspend`} submitLabel="Sospendi escalation" variant="ghost" fields={[{ name: "note", label: "Motivo", type: "textarea", required: true }, { name: "until", label: "Nuovo controllo il", type: "date", required: true }]} />
                ) : null}
              </td>
              ) : null}
            </tr>
          ))}
          {alerts.length === 0 ? <tr><td colSpan={columns} className="empty"><Inbox size={24} aria-hidden />Nessun alert o anomalia nel perimetro.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export function AuditTable({ rows }: { rows: any[] }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr><th>Data e ora</th><th>Attore</th><th>Azione</th><th>Entità</th><th>Prima / dopo</th><th>Motivazione</th><th>Correlation ID</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{formatDateTimeIt(r.at)}</td>
              <td>{r.actor}{r.impersonated_by ? <div className="small muted">imp. {r.impersonated_by}</div> : null}</td>
              <td title={r.action}>{AUDIT_ACTION_LABEL[r.action] ?? humanize(r.action)}</td>
              <td className="small">{ENTITY_LABEL[r.entity_type] ?? humanize(r.entity_type)} {r.entity_id}</td>
              <td className="small diff-cell">
                {r.before_json ? <del title={String(r.before_json)}>{String(r.before_json).slice(0, 120)}</del> : null}
                {r.after_json ? <ins title={String(r.after_json)}>{String(r.after_json).slice(0, 120)}</ins> : null}
                {!r.before_json && !r.after_json ? <span className="muted">—</span> : null}
              </td>
              <td>{r.reason ?? "—"}</td>
              <td className="mono small">{r.correlation_id}</td>
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={7} className="empty"><Inbox size={24} aria-hidden />Nessun evento registrato.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
