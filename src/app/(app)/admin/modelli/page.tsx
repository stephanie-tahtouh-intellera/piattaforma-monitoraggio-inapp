import Link from "next/link";
import { redirect } from "next/navigation";
import { loadTemplates } from "@/infrastructure/config/templates";
import { can } from "@/server/authz";
import { pageActor } from "@/server/page";
import { OWNER_LABEL, STATUS_LABEL, TYPE_LABEL } from "@/ui/labels";

export const metadata = { title: "Modelli di procedura" };

export default async function TemplatesPage() {
  const actor = await pageActor();
  if (!can(actor, "admin")) redirect("/");
  const templates = loadTemplates();
  return (
    <>
      <nav className="breadcrumb" aria-label="Percorso"><Link href="/admin">Amministrazione</Link> › <span aria-current="page">Modelli di procedura</span></nav>
      <div className="page-head">
        <div>
          <h1>Modelli di procedura</h1>
          <div className="page-meta">Configurazione versionata in <span className="mono">config/templates/*.yaml</span>, validata all'avvio (dipendenze lineari, nessun ciclo). Modelli dimostrativi: non sono termini di legge (D-01).</div>
        </div>
      </div>
      {templates.map((t) => (
        <section className="card" key={t.code}>
          <h2>{t.code} – {t.label}</h2>
          <p className="muted">Durata di pianificazione {t.durationMonths} mesi · tipologie: {t.selection.procedureTypes.map((x) => TYPE_LABEL[x] ?? x).join(", ")}{t.selection.awardCriterion ? ` · criterio ${t.selection.awardCriterion}` : ""}{t.selection.instrument ? ` · strumento ${t.selection.instrument}` : ""}{t.illustrative ? " · illustrativo" : ""}</p>
          <table className="data">
            <thead><tr><th>#</th><th>Milestone</th><th>Fase</th><th>Owner</th><th className="num">Offset</th><th className="num">Minimo</th><th>Bloccante</th><th>Policy alert</th><th>Documenti attesi</th></tr></thead>
            <tbody>
              {t.milestones.map((m, i) => (
                <tr key={m.code}>
                  <td>{i + 1}</td>
                  <td>{m.label}<div className="mono small muted">{m.code}</div></td>
                  <td>{STATUS_LABEL[m.phase] ?? m.phase}</td>
                  <td>{OWNER_LABEL[m.owner] ?? m.owner}</td>
                  <td className="num">{m.offsetDays} gg</td>
                  <td className="num">{m.minDurationDays} gg</td>
                  <td>{m.blocking ? "Sì" : "No"}</td>
                  <td>{m.alertPolicy}</td>
                  <td className="small">{m.expectedDocuments.map((d) => `${d.type} (${d.timing === "BEFORE" ? "prerequisito" : "alla consegna"})`).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
