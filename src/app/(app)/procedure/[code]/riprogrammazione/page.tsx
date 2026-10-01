import Link from "next/link";
import { can } from "@/server/authz";
import { procedureDetail } from "@/server/queries";
import { db, pageActor } from "@/server/page";
import { RescheduleWizard } from "@/ui/reschedule-wizard";

export const metadata = { title: "Riprogrammazione" };

export default async function ReschedulePage({ params }: { params: Promise<{ code: string }> }) {
  const actor = await pageActor();
  const { code } = await params;
  const d = procedureDetail(db(), actor, decodeURIComponent(code));
  if (!can(actor, "simulation.create")) {
    return (
      <div className="alert-box warning" role="alert">
        Solo Ufficio Gare e Amministrazione possono creare simulazioni. <Link href={`/procedure/${code}?tab=simulations`}>Vedi le simulazioni</Link>
      </div>
    );
  }
  const pending = d.timeline.filter((m) => !m.actual && m.state !== "NOT_APPLICABLE");
  return (
    <>
      <nav className="breadcrumb" aria-label="Percorso">
        <Link href="/portafoglio">Portafoglio</Link> › <Link href={`/procedure/${d.procedure.code}`}>{d.procedure.code}</Link> › <span aria-current="page">Riprogrammazione</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>Simulazione di riprogrammazione</h1>
          <div className="page-meta">{d.procedure.code} · {d.procedure.title}</div>
        </div>
      </div>
      <RescheduleWizard
        code={d.procedure.code}
        referenceDate={d.referenceDate}
        defaultSource={d.rescheduleSource ?? pending[0]?.code ?? ""}
        fastest={d.fastestCandidate}
        milestones={pending.map((m) => ({ code: m.code, label: m.label, forecast: m.forecast, baseline: m.baseline, state: m.state }))}
        allMilestones={d.timeline.map((m) => ({ code: m.code, label: m.label, forecast: m.forecast, baseline: m.baseline, actual: m.actual }))}
        years={d.evaluation.years}
        rescheduleRequired={d.evaluation.rescheduleRequired}
      />
    </>
  );
}
