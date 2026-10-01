import { redirect } from "next/navigation";
import { formatDateTimeIt } from "@/contracts/format";
import { can } from "@/server/authz";
import { systemStatus } from "@/server/queries";
import { db, pageActor } from "@/server/page";
import { ActionForm } from "@/ui/action-form";

export const metadata = { title: "Amministrazione" };

export default async function AdminPage() {
  const actor = await pageActor();
  if (!can(actor, "admin")) redirect("/");
  const s = systemStatus(db());
  const users = db().prepare("SELECT login, name, role, structure_scope, active FROM users ORDER BY id").all() as any[];
  const imp = s.imports[0] as any;
  const rep = imp ? JSON.parse(imp.summary_json) : null;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Amministrazione</h1>
          <div className="page-meta">Dataset: {s.dataset} · seed caricato il {formatDateTimeIt(s.seededAt)} · provider IA: {String(s.llmProvider)}</div>
        </div>
      </div>
      <div className="grid grid-2">
        <section className="card stack">
          <h2>Data di riferimento</h2>
          <p className="muted">La data di business è configurata e non dipende dall'orologio di sistema (DEC-002). Cambiarla ricalcola scadenze, alert e health.</p>
          <ActionForm endpoint="/api/admin/config/reference-date" method="PUT" submitLabel="Applica e ricalcola" fields={[{ name: "date", label: "Data di riferimento", type: "date", required: true, defaultValue: s.referenceDate }]} />
          <ActionForm endpoint="/api/jobs/run-checks" submitLabel="Esegui controlli ora (run_checks)" variant="secondary" successMessage="Controlli eseguiti." />
        </section>
        <section className="card stack">
          <h2>Reset demo</h2>
          <p className="muted">Ricarica il dataset da zero. Tutte le sessioni vengono chiuse. Operazione auditata.</p>
          <ActionForm
            endpoint="/api/admin/reset"
            submitLabel="Reset"
            variant="danger"
            confirm="Confermi il reset della demo? Tutti i dati inseriti andranno persi."
            redirectTo="/login"
            fields={[
              { name: "dataset", label: "Dataset", type: "select", options: [{ value: "inapp", label: "Portafoglio reale INAPP (PN GDL)" }, { value: "scenarios", label: "Scenari di collaudo P-001…P-012" }] },
              { name: "confirm", label: "Digita RESET per confermare", required: true },
            ]}
          />
        </section>
        <section className="card stack">
          <h2>Impersonazione</h2>
          <p className="muted">Solo per la demo: la sessione è marcata e auditata.</p>
          <ActionForm
            endpoint="/api/admin/impersonate"
            submitLabel="Impersona"
            redirectTo="/"
            fields={[{ name: "login", label: "Utente", type: "select", options: users.filter((u) => u.login !== "admin").map((u) => ({ value: u.login, label: `${u.name} (${u.login})` })) }]}
          />
        </section>
        <section className="card">
          <h2>Stato del sistema</h2>
          <dl className="kv">
            <dt>Worker</dt>
            <dd>{s.worker ? `heartbeat ${formatDateTimeIt(s.worker.lastBeat)}` : "non attivo (avvialo con pnpm worker)"}</dd>
            <dt>Outbox e-mail</dt>
            <dd>{(s.outbox as any[]).map((o) => `${o.status}: ${o.n}`).join(" · ") || "vuota"}</dd>
            <dt>Ultimo import</dt>
            <dd>{imp ? `${imp.source_file} · ${rep.imported} righe importate, ${rep.issues.length} segnalazioni` : "—"}</dd>
          </dl>
        </section>
      </div>
      {rep ? (
        <section className="card">
          <h2>Report di import del workbook</h2>
          <p>Righe lette {rep.rowsRead} · importate {rep.imported} · annullate {rep.cancelled}</p>
          <p className="small muted">Fogli non importati: {rep.skippedSheets.join(", ")}</p>
          <table className="data">
            <thead><tr><th>Riga</th><th>Campo</th><th>Segnalazione</th></tr></thead>
            <tbody>{rep.issues.map((i: any, k: number) => <tr key={k}><td>{i.row}</td><td>{i.field}</td><td>{i.message}</td></tr>)}</tbody>
          </table>
        </section>
      ) : null}
      <section className="card">
        <h2>Utenti demo</h2>
        <table className="data">
          <thead><tr><th>Utente</th><th>Nome</th><th>Ruolo</th><th>Ambito</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.login}><td className="mono">{u.login}</td><td>{u.name}</td><td>{u.role}</td><td>{u.structure_scope}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
