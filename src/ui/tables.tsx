import { Inbox } from "lucide-react";
import Link from "next/link";
import { formatDateTimeIt } from "@/contracts/format";
import { ActionForm } from "./action-form";
import { DateIt, SeverityBadge } from "./badges";
import { isoDate, daysBetween } from "@/domain/dates";
import { ALERT_LEVEL_LABEL, ALERT_STATUS_LABEL, AUDIT_ACTION_LABEL, ENTITY_LABEL, OWNER_LABEL, RULE_LABEL, humanize } from "./labels";

/**
 * Scadenza di un alert in giorni (DEC-135): il ritardo in rosso, l'attesa in blu, la
 * scadenza di oggi in ambra. Il numero di giorni dice da solo quanto la cosa e' urgente,
 * cosa che il livello di escalation («T+1») non faceva. Il livello resta nel `title`.
 * I giorni si contano dalla data di riferimento del Clock, mai dall'orologio di sistema.
 */
function DueDays({ due, level, referenceDate }: { due: string | null; level: string | null; referenceDate: string }) {
  if (!due) return <span className="muted">—</span>;
  const d = daysBetween(isoDate(referenceDate), isoDate(due));
  const tone = d < 0 ? "late" : d === 0 ? "today" : "soon";
  const text = d < 0 ? `${-d} ${-d === 1 ? "giorno" : "giorni"} di ritardo` : d === 0 ? "scade oggi" : `fra ${d} ${d === 1 ? "giorno" : "giorni"}`;
  const title = level ? `Escalation ${level}: ${ALERT_LEVEL_LABEL[level] ?? level}` : undefined;
  return (
    <span>
      <DateIt v={due} />
      <span className={`daychip day-${tone}`} title={title}>{text}</span>
    </span>
  );
}

export function AlertTable({ alerts, canHandle, canSuspend, referenceDate, showProcedure = false }: { alerts: any[]; canHandle: boolean; canSuspend: boolean; referenceDate: string; showProcedure?: boolean }) {
  // Ruoli di sola consultazione (Direttore Generale, DEC-122): niente colonna "Azioni" invece di una colonna vuota.
  const showActions = canHandle || canSuspend;
  const columns = (showProcedure ? 1 : 0) + 6 + (showActions ? 1 : 0);
  return (
    <div className="table-wrap">
      <table className="data alerts-table">
        <colgroup>
          {showProcedure ? <col className="c-proc" /> : null}
          <col className="c-kind" /><col className="c-rule" /><col className="c-sev" /><col className="c-due" /><col className="c-state" /><col className="c-owner" />{showActions ? <col className="c-actions" /> : null}
        </colgroup>
        <thead><tr>{showProcedure ? <th>Procedura</th> : null}<th>Tipo</th><th>Regola</th><th>Severità</th><th>Scadenza</th><th>Stato</th><th>Chi deve agire</th>{showActions ? <th>Azioni</th> : null}</tr></thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              {showProcedure ? <td><Link className="mono" href={`/procedure/${a.procedure_code}?tab=alerts`}>{a.procedure_code}</Link><div className="small muted clamp2" title={a.procedure_title}>{a.procedure_title}</div></td> : null}
              <td>{a.kind === "ANOMALY" ? "Anomalia" : "Alert"}</td>
              <td>{RULE_LABEL[a.rule] ?? humanize(a.rule)}<div className="small muted">{a.title}{a.message && a.message !== a.title ? ` — ${a.message}` : ""}</div></td>
              <td><SeverityBadge value={a.severity} /></td>
              <td><DueDays due={a.due_date ?? null} level={a.current_level ?? null} referenceDate={referenceDate} /></td>
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
