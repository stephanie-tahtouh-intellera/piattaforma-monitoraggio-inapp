import Link from "next/link";
import { formatDateIt } from "@/contracts/format";
import { configuredReferenceDate } from "@/infrastructure/clock";
import { ROLE_LABEL, scopeSql } from "@/server/authz";
import { db, pageActor } from "@/server/page";
import { LANES, STAGES } from "@/ui/labels";
import { DEMO_CASES, LANE_ROLES, PROCESS_TOUR, ROLE_TOUR, TOURS, TOUR_ORDER } from "@/ui/tour/content";
import { MapStepButton, StartTourButton, SwitchActorButton } from "@/ui/tour/switch-actor";

export const metadata = { title: "Guida demo" };

const ROLE_OF_LANE: Record<string, string> = { STRUCTURE: "STRUCTURE_USER", PROCUREMENT: "PROCUREMENT_OFFICER", FINANCE: "FINANCE_OFFICER", SUPPLIER: "SUPPLIER" };

export default async function GuidePage() {
  const actor = await pageActor();
  const d = await db();
  const ref = await configuredReferenceDate(d);
  const dataset = ((await d.prepare("SELECT value FROM system_meta WHERE key='dataset'").get()) as { value: string } | undefined)?.value;
  const scope = scopeSql(actor);
  const visible = new Set(
    (
      (await d
        .prepare(`SELECT p.code FROM procedures p WHERE ${scope.sql} AND p.code IN (${DEMO_CASES.map(() => "?").join(",")})`)
        .all(...scope.params, ...DEMO_CASES.map((c) => c.code))) as { code: string }[]
    ).map((r) => r.code),
  );
  const process = TOURS[PROCESS_TOUR]!;
  const stages = STAGES.filter((s) => s.module === 1);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Guida alla demo</h1>
          <div className="page-meta">Modulo 1 del processo INAPP: dalla programmazione alla stipula del contratto. Dati al {formatDateIt(ref)}; password di tutti gli utenti demo: Demo2026!</div>
        </div>
      </div>

      {dataset !== "inapp" ? (
        <div className="alert-box warning" role="note" style={{ marginBottom: 16 }}>
          I percorsi usano il portafoglio reale PN GDL con i casi dimostrativi. Il dataset attivo è «scenari di collaudo»: l'amministratore deve eseguire Reset demo scegliendo il portafoglio reale.
        </div>
      ) : null}

      <section className="card" aria-labelledby="mappa" id={PROCESS_TOUR}>
        <div className="page-head" style={{ marginBottom: 8 }}>
          <div>
            <h2 id="mappa">{process.title}</h2>
            <p className="muted small" style={{ margin: 0 }}>{process.goal} Il pannello propone il cambio di attore quando il passo tocca a un'altra corsia.</p>
          </div>
          <StartTourButton tour={PROCESS_TOUR} label={`Avvia il percorso per fasi (${process.steps.length} passi)`} />
        </div>
        <div className="table-wrap">
          <table className="iter-board guide-map">
            <caption className="sr-only">Mappa del processo: passi del percorso per corsia e fase</caption>
            <thead>
              <tr>
                <th scope="col">Corsia</th>
                {stages.map((s) => (
                  <th scope="col" key={s.n}>{s.n}. {s.title} <span>{s.sub}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LANES.map((lane) => (
                <tr key={lane.owner}>
                  <th scope="row">{lane.label}</th>
                  {stages.map((s) => (
                    <td key={s.n}>
                      {process.steps.map((st, i) =>
                        st.stage === s.n && st.role === ROLE_OF_LANE[lane.owner] ? (
                          <MapStepButton key={i} step={i} label={st.title.replace(/^\d · /, "").replace(/ ◆$/, "")} role={st.role!} currentRole={actor.role} />
                        ) : null,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">Date chiave del Modulo 1: presentazione della memoria · determina di indizione · aggiudicazione · stipula. Il Modulo 2 (esecuzione e rendicontazione) è sviluppabile in seguito.</p>
      </section>

      <section className="card" aria-labelledby="casi">
        <h2 id="casi">Casi da usare</h2>
        <p className="small muted">BZ-001 e i codici CD-xx sono casi dimostrativi inventati, con fornitori fittizi, ciascuno fermo a un passo diverso del Modulo 1. OP01-S5 e OP04-S18 sono procedure reali del Piano.</p>
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Casi dimostrativi e attori coinvolti</caption>
            <thead>
              <tr><th>Codice</th><th>Oggetto</th><th>Cosa mostra</th><th>Attori</th></tr>
            </thead>
            <tbody>
              {DEMO_CASES.map((c) => (
                <tr key={c.code}>
                  <td className="mono">{visible.has(c.code) ? <Link href={`/procedure/${c.code}?tab=iter`}>{c.code}</Link> : c.code}</td>
                  <td>{c.title}</td>
                  <td>{c.shows}</td>
                  <td className="small">{c.who.map((r) => ROLE_LABEL[r]).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <h2 style={{ marginTop: 24 }}>Percorsi per attore</h2>
      <p className="muted small">Le prime quattro sono le corsie dello schema; Direttore Generale e Amministratore sono attori di supporto.</p>
      <div className="guide-grid">
        {TOUR_ORDER.map((r, i) => {
          const t = ROLE_TOUR[r];
          const mine = actor.role === r;
          return (
            <section key={r} id={r} className={`card guide-card${mine ? " is-current" : ""}`} aria-labelledby={`h-${r}`}>
              <p className="tour-count">{LANE_ROLES.includes(r) ? `Corsia ${i + 1} di ${LANE_ROLES.length}` : "Attore di supporto"}{mine ? " · ruolo attivo" : ""}</p>
              <h2 id={`h-${r}`}>{t.title}</h2>
              <p className="small muted">{t.persona} · utente <span className="mono">{t.login}</span></p>
              <p>{t.goal}</p>
              <h3>Casi</h3>
              <ul className="small">{t.cases.map((c) => <li key={c}>{c}</li>)}</ul>
              <h3>Percorso ({t.steps.length} passi)</h3>
              <ol className="small">{t.steps.map((s) => <li key={s.title}>{s.title}</li>)}</ol>
              <div className="actions" style={{ marginTop: "auto", paddingTop: 12 }}>
                {mine ? <StartTourButton tour={r} /> : <SwitchActorButton role={r} label={`Accedi come ${t.login}`} />}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
