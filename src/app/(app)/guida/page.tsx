import Link from "next/link";
import { formatDateIt } from "@/contracts/format";
import { configuredReferenceDate } from "@/infrastructure/clock";
import { ROLE_LABEL, scopeSql } from "@/server/authz";
import { db, pageActor } from "@/server/page";
import { DEMO_CASES, TOURS, TOUR_ORDER } from "@/ui/tour/content";
import { StartTourButton, SwitchActorButton } from "@/ui/tour/switch-actor";

export const metadata = { title: "Guida demo" };

export default async function GuidePage() {
  const actor = await pageActor();
  const d = db();
  const ref = configuredReferenceDate(d);
  const dataset = (d.prepare("SELECT value FROM system_meta WHERE key='dataset'").get() as { value: string } | undefined)?.value;
  const scope = scopeSql(actor);
  const visible = new Set(
    (d.prepare(`SELECT p.code FROM procedures p WHERE ${scope.sql} AND p.code IN (${DEMO_CASES.map(() => "?").join(",")})`).all(...scope.params, ...DEMO_CASES.map((c) => c.code)) as { code: string }[]).map((r) => r.code),
  );
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Guida alla demo</h1>
          <div className="page-meta">Un percorso guidato per ciascuno dei 7 attori. Dati al {formatDateIt(ref)}; password di tutti gli utenti demo: Demo2026!</div>
        </div>
      </div>

      {dataset !== "inapp" ? (
        <div className="alert-box warning" role="note" style={{ marginBottom: 16 }}>
          I percorsi citano i casi del portafoglio reale PN GDL. Il dataset attivo è «scenari di collaudo»: per seguirli l'amministratore deve eseguire Reset demo scegliendo il portafoglio reale.
        </div>
      ) : null}

      <section className="card" aria-labelledby="storia">
        <h2 id="storia">La storia in sette passaggi</h2>
        <p>
          La piattaforma segue una procedura di acquisto dal fabbisogno al pagamento. Ogni attore vede solo ciò che gli compete e ogni decisione che cambia i dati passa da una seconda persona. L'ordine consigliato per la presentazione è:
        </p>
        <ol className="guide-flow">
          {TOUR_ORDER.map((r) => (
            <li key={r}>
              <a href={`#${r}`}>{ROLE_LABEL[r]}</a>
              <span className="small muted"> – {TOURS[r].goal}</span>
            </li>
          ))}
        </ol>
        <p className="small muted">
          Durante qualunque pagina il pulsante «Guida demo» in basso a destra mostra le sezioni della pagina e cosa può fare il ruolo attivo. Il tasto Esc riduce il pannello.
        </p>
      </section>

      <section className="card" aria-labelledby="casi">
        <h2 id="casi">Casi da usare</h2>
        <p className="small muted">I codici CD-xx e BZ-001 sono casi dimostrativi inventati, con fornitori fittizi, aggiunti al portafoglio reale per dare a ogni attore un'attività concreta. OP01-S5 e OP04-S18 sono procedure reali del Piano.</p>
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Casi dimostrativi e attori coinvolti</caption>
            <thead>
              <tr><th>Codice</th><th>Oggetto</th><th>Cosa mostra</th><th>Attori</th></tr>
            </thead>
            <tbody>
              {DEMO_CASES.map((c) => (
                <tr key={c.code}>
                  <td className="mono">{visible.has(c.code) ? <Link href={`/procedure/${c.code}`}>{c.code}</Link> : c.code}</td>
                  <td>{c.title}</td>
                  <td>{c.shows}</td>
                  <td className="small">{c.who.map((r) => ROLE_LABEL[r]).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="guide-grid">
        {TOUR_ORDER.map((r, i) => {
          const t = TOURS[r];
          const mine = actor.role === r;
          return (
            <section key={r} id={r} className={`card guide-card${mine ? " is-current" : ""}`} aria-labelledby={`h-${r}`}>
              <p className="tour-count">Attore {i + 1} di {TOUR_ORDER.length}{mine ? " · ruolo attivo" : ""}</p>
              <h2 id={`h-${r}`}>{ROLE_LABEL[r]}</h2>
              <p className="small muted">{t.persona} · utente <span className="mono">{t.login}</span></p>
              <p>{t.goal}</p>
              <h3>Casi</h3>
              <ul className="small">{t.cases.map((c) => <li key={c}>{c}</li>)}</ul>
              <h3>Percorso ({t.steps.length} passi)</h3>
              <ol className="small">{t.steps.map((s) => <li key={s.title}>{s.title}</li>)}</ol>
              <div className="actions" style={{ marginTop: "auto", paddingTop: 12 }}>
                {mine ? (
                  <StartTourButton />
                ) : (
                  <SwitchActorButton login={t.login} impersonate={actor.role === "ADMIN" && !actor.impersonatedBy} label={actor.role === "ADMIN" && !actor.impersonatedBy ? `Impersona ${t.login} e avvia` : `Accedi come ${t.login}`} />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
