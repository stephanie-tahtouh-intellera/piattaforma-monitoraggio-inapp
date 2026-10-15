"use client";
import { Bot, Compass, FileText, LayoutDashboard, ListChecks, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "inapp.sidebar.collapsed";
const NARROW_PX = 900;

export interface NavItem { href: string; label: string; icon: string; count?: number; hint?: string }
const ICONS = { dashboard: LayoutDashboard, portfolio: ListChecks, alerts: TriangleAlert, assistant: Bot, audit: ShieldCheck, admin: Settings, docs: FileText, guide: Compass };

export function SideNav({ items, footer }: { items: (NavItem | "sep")[]; footer: string }) {
  const path = usePathname();
  const nav = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  // Preferenza dell'utente (salvata nel browser) e larghezza della finestra: sotto NARROW_PX la barra si chiude
  // da sola, senza toccare la preferenza; tornando a una finestra larga si ripristina la scelta dell'utente.
  const preferred = useRef(false);
  const narrow = useRef(false);
  useEffect(() => {
    try {
      preferred.current = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {}
    const mq = window.matchMedia(`(max-width: ${NARROW_PX - 1}px)`);
    const apply = () => {
      narrow.current = mq.matches;
      setCollapsed(mq.matches ? true : preferred.current);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    nav.current?.closest(".shell")?.setAttribute("data-collapsed", String(collapsed));
  }, [collapsed]);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    // In una finestra stretta l'apertura è temporanea: la preferenza si salva solo in una finestra larga.
    if (!narrow.current) {
      preferred.current = next;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
    }
  };
  return (
    <nav ref={nav} className="sidebar" aria-label="Navigazione principale">
      <button type="button" className="sidebar-toggle" onClick={toggle} aria-expanded={!collapsed} aria-controls="contenuto-nav" aria-label={collapsed ? "Apri il menu" : "Chiudi il menu"} title={collapsed ? "Apri il menu" : "Chiudi il menu"}>
        {collapsed ? <PanelLeftOpen size={14} aria-hidden /> : <PanelLeftClose size={14} aria-hidden />}
      </button>
      <ul id="contenuto-nav">
        {items.map((it, i) =>
          it === "sep" ? (
            <li key={`s${i}`} className="sep" aria-hidden />
          ) : (
            <li key={it.href}>
              <Link href={it.href} title={it.hint ? (collapsed ? `${it.label} · ${it.hint}` : it.hint) : collapsed ? it.label : undefined} aria-current={(it.href === "/" ? path === "/" : path.startsWith(it.href)) ? "page" : undefined}>
                {(() => {
                  const I = ICONS[it.icon as keyof typeof ICONS] ?? FileText;
                  return <I size={20} aria-hidden />;
                })()}
                <span className="nav-label">{it.label}</span>
                {it.count ? <span className="count" aria-label={it.hint ?? `${it.count} da gestire`}>{it.count}</span> : null}
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
