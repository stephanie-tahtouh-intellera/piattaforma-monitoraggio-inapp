import Link from "next/link";
import { formatDateTimeIt } from "@/contracts/format";
import { ActionForm } from "./action-form";
import { DateIt, SeverityBadge } from "./badges";
import { ALERT_STATUS_LABEL, OWNER_LABEL, RULE_LABEL } from "./labels";

export function AlertTable({ alerts, canHandle, canSuspend, showProcedure = false }: { alerts: any[]; canHandle: boolean; canSuspend: boolean; showProcedure?: boolean }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr>{showProcedure ? <th>Procedura</th> : null}<th>Tipo</th><th>Regola</th><th>Severità</th><th>Livello</th><th>Scadenza</th><th>Stato</th><th>Owner</th><th>Azioni</th></tr></thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              {showProcedure ? <td className="mono"><Link href={`/procedure/${a.procedure_code}?tab=alerts`}>{a.procedure_code}</Link><div className="small muted clamp2" title={a.procedure_title}>{a.procedure_title}</div></td> : null}
              <td>{a.kind === "ANOMALY" ? "Anomalia" : "Alert"}</td>
              <td>{RULE_LABEL[a.rule] ?? a.rule}<div className="small muted">{a.title}{a.message && a.message !== a.title ? ` — ${a.message}` : ""}</div></td>
              <td><SeverityBadge value={a.severity} /></td>
              <td>{a.current_level ?? "—"}</td>
              <td><DateIt v={a.due_date} /></td>
              <td>{ALERT_STATUS_LABEL[a.status] ?? a.status}{a.acknowledged_by ? <div className="small muted">in carico a {a.acknowledged_by}</div> : null}{a.resolution_note ? <div className="small muted">«{a.resolution_note}»</div> : null}</td>
              <td>{OWNER_LABEL[a.owner] ?? a.owner ?? "—"}</td>
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
            </tr>
          ))}
          {alerts.length === 0 ? <tr><td colSpan={9} className="muted">Nessun alert o anomalia.</td></tr> : null}
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
              <td className="mono">{r.action}</td>
              <td className="small">{r.entity_type} {r.entity_id}</td>
              <td className="small" style={{ maxWidth: 360 }}>{r.before_json ? <div>prima: <code>{String(r.before_json).slice(0, 160)}</code></div> : null}{r.after_json ? <div>dopo: <code>{String(r.after_json).slice(0, 160)}</code></div> : null}</td>
              <td>{r.reason ?? "—"}</td>
              <td className="mono small">{r.correlation_id}</td>
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={7} className="muted">Nessun evento.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
