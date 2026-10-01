import { redirect } from "next/navigation";
import { verifyAuditChain } from "@/infrastructure/audit";
import { can } from "@/server/authz";
import { auditList } from "@/server/queries";
import { db, pageActor, sp } from "@/server/page";
import { AuditTable } from "@/ui/tables";

export const metadata = { title: "Audit" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await pageActor();
  if (!can(actor, "audit.read")) redirect("/");
  const q = await searchParams;
  const f = { procedure: sp(q.procedure), actor: sp(q.actor), action: sp(q.action) };
  const rows = auditList(db(), { ...(f.procedure ? { procedure: f.procedure } : {}), ...(f.actor ? { actor: f.actor } : {}), ...(f.action ? { action: f.action } : {}) }) as any[];
  const chain = verifyAuditChain(db());
  const actions = (db().prepare("SELECT DISTINCT action FROM audit_events ORDER BY action").all() as { action: string }[]).map((r) => r.action);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Audit</h1>
          <div className="page-meta">Eventi append-only con catena di hash: {chain.ok ? `integra (${chain.count} eventi)` : `INTERROTTA all'evento ${chain.brokenAt}`}.</div>
        </div>
      </div>
      <form className="filters" method="get">
        <div className="field"><label htmlFor="a-p">Procedura</label><input id="a-p" name="procedure" type="text" defaultValue={f.procedure ?? ""} /></div>
        <div className="field"><label htmlFor="a-u">Utente</label><input id="a-u" name="actor" type="text" defaultValue={f.actor ?? ""} /></div>
        <div className="field">
          <label htmlFor="a-a">Azione</label>
          <select id="a-a" name="action" defaultValue={f.action ?? ""}>
            <option value="">Tutte</option>
            {actions.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <button className="btn btn-primary">Filtra</button>
      </form>
      <AuditTable rows={rows} />
    </>
  );
}
