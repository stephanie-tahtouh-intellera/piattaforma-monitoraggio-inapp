import Link from "next/link";
import { can } from "@/server/authz";
import { alertsList } from "@/server/queries";
import { db, pageActor, sp } from "@/server/page";
import { AlertTable } from "@/ui/tables";
import { ActionForm } from "@/ui/action-form";

export const metadata = { title: "Centro alert" };
const VIEWS = [["", "Tutti"], ["mine", "Miei"], ["critical", "Critici"], ["reschedule", "Da riprogrammare"], ["finance", "Finanziari"]] as const;

export default async function AlertsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await pageActor();
  const q = await searchParams;
  const view = sp(q.view) ?? "";
  const kind = sp(q.kind);
  const status = sp(q.status);
  const r = alertsList(db(), actor, { view, ...(kind ? { kind } : {}), ...(status ? { status } : {}) });
  const link = (patch: Record<string, string>) => {
    const u = new URLSearchParams({ ...(view ? { view } : {}), ...(kind ? { kind } : {}), ...(status ? { status } : {}), ...patch });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    return `/alert?${u.toString()}`;
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Centro alert</h1>
          <div className="page-meta">Coda unica di alert temporali e anomalie di dato (US-042). Le anomalie non correggono mai i dati.</div>
        </div>
        <div className="actions">
          {view === "mine" ? <ActionForm endpoint="/api/notifications/read" submitLabel="Segna notifiche come lette" inline variant="secondary" /> : null}
          <a className="btn btn-secondary" href="/api/exports/alerts.csv">Esporta CSV</a>
        </div>
      </div>
      <nav className="tabs" aria-label="Viste">
        {VIEWS.map(([k, l]) => (
          <Link key={k} href={link({ view: k })} aria-current={view === k ? "page" : undefined}>
            {l}
          </Link>
        ))}
      </nav>
      <div className="actions" style={{ marginBottom: 12 }}>
        <span className="label">Tipo:</span>
        <Link className={`chip ${!kind ? "chip-filter" : ""}`} href={link({ kind: "" })}>Tutti</Link>
        <Link className={`chip ${kind === "ALERT" ? "chip-filter" : ""}`} href={link({ kind: "ALERT" })}>Alert</Link>
        <Link className={`chip ${kind === "ANOMALY" ? "chip-filter" : ""}`} href={link({ kind: "ANOMALY" })}>Anomalie</Link>
        <span className="label" style={{ marginLeft: 16 }}>Stato:</span>
        <Link className={`chip ${!status ? "chip-filter" : ""}`} href={link({ status: "" })}>Da gestire</Link>
        <Link className={`chip ${status === "RESOLVED,AUTO_CLOSED" ? "chip-filter" : ""}`} href={link({ status: "RESOLVED,AUTO_CLOSED" })}>Chiusi</Link>
      </div>
      <p className="muted" aria-live="polite">{r.items.length} elementi</p>
      <AlertTable alerts={r.items as any[]} canHandle={can(actor, "alert.handle")} canSuspend={can(actor, "alert.suspend")} showProcedure />
    </>
  );
}
