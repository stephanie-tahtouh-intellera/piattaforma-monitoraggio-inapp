import Link from "next/link";
import { can } from "@/server/authz";
import { alertsList } from "@/server/queries";
import { db, pageActor, sp } from "@/server/page";
import { OWNER_LABEL } from "@/ui/labels";
import { AlertTable } from "@/ui/tables";
import { ActionForm } from "@/ui/action-form";

export const metadata = { title: "Centro alert" };
// «Notificati a me» non è più un tab (DEC-135): non è un modo di leggere la coda ma la
// posta in arrivo della campanella, e per i ruoli senza notifiche era un tab sempre vuoto.
// Resta raggiungibile da lì come filtro removibile, accanto a «Chi deve agire».
const VIEWS = [["", "Tutti"], ["critical", "Critici"], ["reschedule", "Da riprogrammare"], ["finance", "Finanziari"]] as const;

export default async function AlertsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await pageActor();
  const q = await searchParams;
  const view = sp(q.view) ?? "";
  const mine = view === "mine";
  const kind = sp(q.kind);
  const status = sp(q.status);
  // Destinatario logico: la corsia che deve prendere in carico (DEC-127). Arriva dal grafico
  // "Alert aperti per chi deve agire" della dashboard.
  const owner = sp(q.owner);
  const r = await alertsList(await db(), actor, { view, ...(kind ? { kind } : {}), ...(status ? { status } : {}), ...(owner ? { owner } : {}) });
  const link = (patch: Record<string, string>) => {
    const u = new URLSearchParams({ ...(view ? { view } : {}), ...(kind ? { kind } : {}), ...(status ? { status } : {}), ...(owner ? { owner } : {}), ...patch });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    return `/alert?${u.toString()}`;
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Centro alert</h1>
          <div className="page-meta">Coda unica di alert temporali e anomalie di dato. Le anomalie non correggono mai i dati. «Scadenza» dice quanti giorni mancano, o di quanti si è in ritardo, rispetto alla data di riferimento; «Chi deve agire» la corsia che deve prenderlo in carico.</div>
        </div>
        <div className="actions">
          {mine ? <ActionForm endpoint="/api/notifications/read" submitLabel="Segna notifiche come lette" inline variant="secondary" /> : null}
          <a className="btn btn-secondary" href="/api/exports/alerts.csv">Esporta CSV</a>
        </div>
      </div>
      <nav className="tabs" aria-label="Viste">
        {VIEWS.map(([k, l]) => (
          <Link key={k} href={link({ view: k })} aria-current={view === k || (mine && k === "") ? "page" : undefined}>
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
        {mine ? (
          <>
            <span className="label" style={{ marginLeft: 16 }}>Dalla campanella:</span>
            <Link className="chip chip-filter" href={link({ view: "" })} aria-label="Togli il filtro: notificati a me">
              notificati a me ×
            </Link>
          </>
        ) : null}
        {owner ? (
          <>
            <span className="label" style={{ marginLeft: 16 }}>Chi deve agire:</span>
            <Link className="chip chip-filter" href={link({ owner: "" })} aria-label={`Togli il filtro: ${OWNER_LABEL[owner] ?? owner}`}>
              {OWNER_LABEL[owner] ?? owner} ×
            </Link>
          </>
        ) : null}
      </div>
      <p className="muted" aria-live="polite">{r.items.length} elementi</p>
      <AlertTable alerts={r.items as any[]} referenceDate={r.referenceDate} canHandle={can(actor, "alert.handle")} canSuspend={can(actor, "alert.suspend")} showProcedure />
    </>
  );
}
