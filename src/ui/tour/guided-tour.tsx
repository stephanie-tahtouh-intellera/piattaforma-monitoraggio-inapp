"use client";
import { Compass, Lightbulb, Minus, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Role } from "@/domain/model";
import { TOURS, pageHelp, type TourStep } from "./content";
import { CLOSED, TOUR_KEY, readTourState as read, type TourState } from "./state";

function onStepPage(step: TourStep, pathname: string, params: URLSearchParams): boolean {
  const u = new URL(step.path, "http://guida.local");
  if (decodeURIComponent(u.pathname) !== decodeURIComponent(pathname)) return false;
  const want = [...u.searchParams].sort().join("&");
  const have = [...params].sort().join("&");
  return want === have;
}

/**
 * Guida demo per attore (DEC-106): pannello non modale con il percorso del ruolo attivo
 * e l'aiuto della pagina corrente. Lo stato è nel browser; nessuna chiamata al server.
 */
export function GuidedTour({ role, roleLabel, nextLabel }: { role: Role; roleLabel: string; nextLabel: string | null }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [st, setSt] = useState<TourState>(CLOSED);
  const [ready, setReady] = useState(false);
  const headRef = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef(false);
  const tour = TOURS[role];

  const save = useCallback((next: TourState) => {
    focusNext.current = next.mode !== "closed";
    setSt(next);
    localStorage.setItem(TOUR_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    const s = read();
    if (s.autostart) {
      save({ role, step: 0, mode: "tour" });
      const first = tour.steps[0]!;
      if (!onStepPage(first, window.location.pathname, new URLSearchParams(window.location.search))) router.push(first.path);
    }
    else if (s.role && s.role !== role) save(CLOSED);
    else setSt(s);
    setReady(true);
  }, [role, save]);

  const step = st.mode === "tour" ? tour.steps[Math.min(st.step, tour.steps.length - 1)] : undefined;
  const here = step ? onStepPage(step, pathname, new URLSearchParams(params.toString())) : false;

  // Evidenzia l'elemento del passo, con qualche tentativo mentre la pagina finisce di caricare
  useEffect(() => {
    if (!step?.target || !here) return;
    let el: Element | null = null;
    const timers = [0, 150, 500, 1200].map((ms) =>
      window.setTimeout(() => {
        if (el) return;
        el = document.querySelector(step.target!);
        if (!el) return;
        el.classList.add("tour-target");
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      }, ms),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      el?.classList.remove("tour-target");
    };
  }, [step, here, pathname, params]);

  useEffect(() => {
    if (focusNext.current) headRef.current?.focus({ preventScroll: true });
    focusNext.current = false;
  }, [st.mode, st.step]);

  const go = (i: number) => {
    const target = tour.steps[i]!;
    save({ role, step: i, mode: "tour" });
    if (!onStepPage(target, pathname, new URLSearchParams(params.toString()))) router.push(target.path);
  };

  if (!ready) return null;

  if (st.mode === "closed") {
    return (
      <button type="button" className="tour-launcher" onClick={() => save({ role, step: st.role === role ? st.step : 0, mode: "help" })} aria-label="Apri la guida demo">
        <Compass size={18} aria-hidden /> Guida demo
      </button>
    );
  }

  const help = pageHelp(pathname, params.get("tab"));
  const roleActions = help ? [...(help.actions.ALL ?? []), ...(help.actions[role] ?? [])] : [];
  const last = st.step >= tour.steps.length - 1;

  return (
    <aside className="tour-panel" aria-labelledby="tour-head" onKeyDown={(e) => e.key === "Escape" && save({ ...st, role, mode: "closed" })}>
      <div className="tour-top">
        <span className="tour-kicker">
          <Compass size={16} aria-hidden /> Guida demo · {roleLabel}
        </span>
        <span className="tour-icons">
          <button type="button" className="icon-btn" onClick={() => save({ ...st, role, mode: "closed" })} aria-label="Riduci la guida">
            <Minus size={16} aria-hidden />
          </button>
          <button type="button" className="icon-btn" onClick={() => save({ role, step: 0, mode: "closed" })} aria-label="Chiudi la guida e ricomincia da capo">
            <X size={16} aria-hidden />
          </button>
        </span>
      </div>

      {st.mode === "tour" && step ? (
        <>
          <div className="tour-progress" aria-hidden>
            <span style={{ width: `${((st.step + 1) / tour.steps.length) * 100}%` }} />
          </div>
          <div className="tour-body" aria-live="polite">
            <p className="tour-count">
              Passo {st.step + 1} di {tour.steps.length}
            </p>
            <h2 id="tour-head" tabIndex={-1} ref={headRef}>
              {step.title}
            </h2>
            <p>{step.body}</p>
            {step.can?.length ? (
              <>
                <h3>Cosa puoi fare qui</h3>
                <ul>{step.can.map((c) => <li key={c}>{c}</li>)}</ul>
              </>
            ) : null}
            {step.tryIt ? (
              <p className="tour-try">
                <Lightbulb size={16} aria-hidden /> <span><strong>Prova ora:</strong> {step.tryIt}</span>
              </p>
            ) : null}
            {!here ? (
              <p className="tour-away">
                Questo passo è su un'altra pagina.{" "}
                <button type="button" className="linkbtn" onClick={() => router.push(step.path)}>
                  Vai alla pagina
                </button>
              </p>
            ) : null}
            {last ? (
              <p className="tour-end">
                Hai completato il percorso di {roleLabel}.{" "}
                {nextLabel ? <>Prosegui con <Link href={`/guida#${tour.next}`}>{nextLabel}</Link> per vedere il seguito della storia.</> : <Link href="/guida">Torna all'elenco delle guide</Link>}
              </p>
            ) : null}
          </div>
          <div className="tour-nav">
            <button type="button" className="btn btn-ghost btn-sm" disabled={st.step === 0} onClick={() => go(st.step - 1)}>
              ‹ Indietro
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => save({ ...st, role, mode: "help" })}>
              Aiuto pagina
            </button>
            {last ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => save({ role, step: 0, mode: "closed" })}>
                Fine
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => go(st.step + 1)}>
                Avanti ›
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="tour-body">
            <p className="tour-count">Aiuto della pagina</p>
            <h2 id="tour-head" tabIndex={-1} ref={headRef}>
              {help?.title ?? "Pagina"}
            </h2>
            {help ? <p>{help.summary}</p> : <p>Nessun aiuto specifico per questa pagina.</p>}
            {help?.sections.length ? (
              <>
                <h3>Sezioni</h3>
                <dl className="tour-sections">
                  {help.sections.map(([n, d]) => (
                    <div key={n}>
                      <dt>{n}</dt>
                      <dd>{d}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}
            <h3>Cosa puoi fare come {roleLabel}</h3>
            {roleActions.length ? <ul>{roleActions.map((a) => <li key={a}>{a}</li>)}</ul> : <p className="muted">Solo consultazione.</p>}
          </div>
          <div className="tour-nav">
            <Link className="btn btn-ghost btn-sm" href="/guida">
              Tutte le guide
            </Link>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => go(st.role === role ? st.step : 0)}>
              {st.step > 0 && st.role === role ? `Riprendi il percorso (passo ${st.step + 1})` : `Avvia il percorso (${tour.steps.length} passi)`}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
