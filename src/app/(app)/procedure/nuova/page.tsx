import Link from "next/link";
import { redirect } from "next/navigation";
import { configuredReferenceDate } from "@/infrastructure/clock";
import { db, pageActor } from "@/server/page";
import { DraftForm } from "@/ui/draft-form";
import { TYPE_LABEL } from "@/ui/labels";

export const metadata = { title: "Nuova procedura in bozza" };

export default async function NewDraftPage() {
  const actor = await pageActor();
  if (!(actor.role === "STRUCTURE_USER" || actor.role === "ADMIN")) redirect("/portafoglio");
  const projects = (await (await db()).prepare("SELECT code, name FROM projects WHERE active = 1 ORDER BY code").all()) as { code: string; name: string }[];
  return (
    <>
      <nav className="breadcrumb" aria-label="Percorso">
        <Link href="/portafoglio">Portafoglio</Link> › <span aria-current="page">Nuova procedura</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>Nuova procedura in bozza</h1>
          <div className="page-meta">La bozza non genera date effettive. La baseline si congela alla consegna della memoria; poi la titolarità passa all'Ufficio Gare.</div>
        </div>
      </div>
      <section className="card">
        <DraftForm projects={projects} types={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))} referenceDate={await configuredReferenceDate(await db())} />
      </section>
    </>
  );
}
