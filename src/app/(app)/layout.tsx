import { Bell } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { configuredReferenceDate } from "@/infrastructure/clock";
import { formatDateIt } from "@/contracts/format";
import { ROLE_LABEL, can, scopeSql } from "@/server/authz";
import { db, pageActor } from "@/server/page";
import { DemoBanner } from "@/ui/demo-banner";
import { LogoutButton, SideNav, type NavItem } from "@/ui/nav";
import { TOURS } from "@/ui/tour/content";
import { GuidedTour } from "@/ui/tour/guided-tour";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await pageActor();
  const d = db();
  const ref = configuredReferenceDate(d);
  const scope = scopeSql(actor);
  const openAlerts = (d.prepare(`SELECT COUNT(*) AS n FROM alerts a JOIN procedures p ON p.id = a.procedure_id WHERE ${scope.sql} AND a.kind='ALERT' AND a.status IN ('OPEN')`).get(...scope.params) as { n: number }).n;
  const unread = (d.prepare("SELECT COUNT(*) AS n FROM alert_notifications n WHERE n.user_id = ? AND n.channel='IN_APP' AND NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notification_id = n.id AND r.user_id = ?)").get(actor.userId, actor.userId) as { n: number }).n;
  const validations = (d.prepare(`SELECT COUNT(*) AS n FROM validation_items v JOIN procedures p ON p.id = v.procedure_id WHERE ${scope.sql} AND v.status='OPEN'`).get(...scope.params) as { n: number }).n;
  const dataset = (d.prepare("SELECT value FROM system_meta WHERE key='dataset'").get() as { value: string } | undefined)?.value ?? "";
  const items: (NavItem | "sep")[] = [
    { href: "/", label: "Dashboard", icon: "dashboard" },
    { href: "/portafoglio", label: "Portafoglio", icon: "portfolio" },
  ];
  if (actor.role !== "SUPPLIER") items.push({ href: "/alert", label: "Centro alert", icon: "alerts", count: openAlerts });
  if (can(actor, "validation.decide") || actor.role === "ADMIN") items.push({ href: "/validazione", label: "Coda di validazione", icon: "validation", count: validations });
  if (can(actor, "assistant")) items.push({ href: "/assistente", label: "Assistente", icon: "assistant" });
  if (can(actor, "audit.read")) items.push("sep", { href: "/audit", label: "Audit", icon: "audit" });
  if (can(actor, "admin")) items.push({ href: "/admin", label: "Amministrazione", icon: "admin" });
  items.push("sep", { href: "/guida", label: "Guida demo", icon: "guide" });
  const next = TOURS[actor.role].next;

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
              <Link href="/alert?view=mine" className="bell" aria-label={`Notifiche: ${unread} non lette`}>
                <Bell size={20} aria-hidden />
                {unread ? <span className="count">{unread}</span> : null}
              </Link>
            ) : null}
            <span>
              {actor.name}
              {actor.impersonatedBy ? <span className="small"> (impersonato da {actor.impersonatedBy})</span> : null}
            </span>
            <span className="role-badge">{ROLE_LABEL[actor.role]}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="shell">
        <SideNav items={items} footer={`Ruolo attivo: ${ROLE_LABEL[actor.role]}${actor.structureScope !== "*" ? ` · ambito ${actor.structureScope}` : ""}`} />
        <main id="contenuto" tabIndex={-1}>
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <GuidedTour role={actor.role} roleLabel={ROLE_LABEL[actor.role]} nextLabel={next ? ROLE_LABEL[next] : null} />
      </Suspense>
    </>
  );
}
