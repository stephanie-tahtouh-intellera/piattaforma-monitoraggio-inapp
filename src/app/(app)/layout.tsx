import { Bell } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { configuredReferenceDate } from "@/infrastructure/clock";
import { formatDateIt } from "@/contracts/format";
import { ROLE_LABEL, can, scopeSql } from "@/server/authz";
import { db, pageActor } from "@/server/page";
import { DemoBanner } from "@/ui/demo-banner";
import { LogoutButton, SideNav, type NavItem } from "@/ui/nav";
import { GuidedTour } from "@/ui/tour/guided-tour";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await pageActor();
  const d = await db();
  const ref = await configuredReferenceDate(d);
  const scope = scopeSql(actor);
  const openAlerts = ((await d
    .prepare(`SELECT COUNT(*) AS n FROM alerts a JOIN procedures p ON p.id = a.procedure_id WHERE ${scope.sql} AND a.kind='ALERT' AND a.status IN ('OPEN')`)
    .get(...scope.params)) as { n: number }).n;
  const unread = ((await d
    .prepare("SELECT COUNT(*) AS n FROM alert_notifications n WHERE n.user_id = ? AND n.channel='IN_APP' AND NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notification_id = n.id AND r.user_id = ?)")
    .get(actor.userId, actor.userId)) as { n: number }).n;
  const dataset = ((await d.prepare("SELECT value FROM system_meta WHERE key='dataset'").get()) as { value: string } | undefined)?.value ?? "";
  const scopeName =
    actor.structureScope === "*"
      ? null
      : (((await d.prepare("SELECT name FROM structures WHERE code = ?").get(actor.structureScope)) as { name: string } | undefined)?.name ?? actor.structureScope.replaceAll("_", " "));
  const items: (NavItem | "sep")[] = [
    { href: "/", label: "Dashboard", icon: "dashboard" },
    { href: "/portafoglio", label: "Portafoglio", icon: "portfolio" },
  ];
  if (actor.role !== "SUPPLIER") items.push({ href: "/alert", label: "Centro alert", icon: "alerts", count: openAlerts, hint: `${openAlerts} alert aperti` });
  if (can(actor, "assistant")) items.push({ href: "/assistente", label: "Assistente", icon: "assistant" });
  if (can(actor, "audit.read")) items.push("sep", { href: "/audit", label: "Audit", icon: "audit" });
  if (can(actor, "admin")) items.push({ href: "/admin", label: "Amministrazione", icon: "admin" });
  items.push("sep", { href: "/guida", label: "Guida demo", icon: "guide" });

  return (
    <>
      <a className="skip-link" href="#contenuto">
        Salta al contenuto principale
      </a>
      <header>
        <DemoBanner referenceDate={ref} />
        <div className="app-header on-inverse">
          <Link href="/" className="brand" aria-label="INAPP — Monitoraggio Gare e Contratti, vai alla dashboard">
            <img src="/brand/inapp-logo-white.svg" alt="" />
            <span className="brand-text">
              <strong>Monitoraggio Gare e Contratti</strong>
              <span>Prototipo dimostrativo · {dataset === "inapp" ? "dati PN GDL" : "scenari di collaudo"}</span>
            </span>
          </Link>
          <form className="header-search" action="/portafoglio" role="search">
            <label htmlFor="q" className="sr-only">
              Cerca per codice o oggetto
            </label>
            <input id="q" name="q" type="search" placeholder="Cerca per codice o oggetto" />
          </form>
          <div className="header-right">
            <span className="refdate">Dati al {formatDateIt(ref)}</span>
            {actor.role !== "SUPPLIER" ? (
              <Link href="/alert?view=mine" className="bell" aria-label={`Notifiche: ${unread} non lette`} title={`Notifiche non lette: ${unread}`}>
                <Bell size={20} aria-hidden />
                {unread ? <span className="count">{unread}</span> : null}
              </Link>
            ) : null}
            <span className="user-name">
              {actor.name}
              {actor.impersonatedBy ? <span className="small"> (impersonato da {actor.impersonatedBy})</span> : null}
            </span>
            <span className="role-badge">{ROLE_LABEL[actor.role]}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="shell">
        <SideNav items={items} footer={`Ruolo attivo: ${ROLE_LABEL[actor.role]}${scopeName ? ` · ambito ${scopeName}` : ""}`} />
        <main id="contenuto" tabIndex={-1}>
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <GuidedTour role={actor.role} roleLabel={ROLE_LABEL[actor.role]} roleLabels={ROLE_LABEL} />
      </Suspense>
    </>
  );
}
