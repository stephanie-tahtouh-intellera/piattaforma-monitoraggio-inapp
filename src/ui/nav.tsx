"use client";
import { Bell, Bot, ClipboardCheck, Compass, FileText, LayoutDashboard, ListChecks, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem { href: string; label: string; icon: string; count?: number }
const ICONS = { dashboard: LayoutDashboard, portfolio: ListChecks, alerts: Bell, validation: ClipboardCheck, assistant: Bot, audit: ShieldCheck, admin: Settings, docs: FileText, guide: Compass };

export function SideNav({ items, footer }: { items: (NavItem | "sep")[]; footer: string }) {
  const path = usePathname();
  return (
    <nav className="sidebar" aria-label="Navigazione principale">
      <ul>
        {items.map((it, i) =>
          it === "sep" ? (
            <li key={`s${i}`} className="sep" aria-hidden />
          ) : (
            <li key={it.href}>
              <Link href={it.href} aria-current={(it.href === "/" ? path === "/" : path.startsWith(it.href)) ? "page" : undefined}>
                {(() => {
                  const I = ICONS[it.icon as keyof typeof ICONS] ?? FileText;
                  return <I size={20} aria-hidden />;
                })()}
                <span>{it.label}</span>
                {it.count ? <span className="count" aria-label={`${it.count} da gestire`}>{it.count}</span> : null}
              </Link>
            </li>
          ),
        )}
      </ul>
      <div className="side-foot">{footer}</div>
    </nav>
  );
}

export function LogoutButton() {
  return (
    <button
      className="linkbtn"
      onClick={async () => {
        const m = document.cookie.match(/(?:^|; )inapp_csrf=([^;]+)/);
        await fetch("/api/auth/logout", { method: "POST", headers: { "x-csrf-token": m ? decodeURIComponent(m[1]!) : "" } });
        window.location.href = "/login";
      }}
    >
      Esci
    </button>
  );
}
