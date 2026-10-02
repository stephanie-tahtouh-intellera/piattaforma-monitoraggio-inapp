import Link from "next/link";
import { redirect } from "next/navigation";
import { configuredReferenceDate } from "@/infrastructure/clock";
import { db, pageActor } from "@/server/page";
import { ActionForm } from "@/ui/action-form";
import { TYPE_LABEL } from "@/ui/labels";

export const metadata = { title: "Nuova procedura in bozza" };

export default async function NewDraftPage() {
  const actor = await pageActor();
  if (!(actor.role === "STRUCTURE_USER" || actor.role === "ADMIN")) redirect("/portafoglio");
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
        <ActionForm
          endpoint="/api/procedures"
          submitLabel="Crea bozza"
          redirectTo="/portafoglio"
          successMessage="Bozza creata."
          fields={[
            { name: "title", label: "Oggetto", required: true },
            { name: "type", label: "Tipologia prevista", type: "select", options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
            { name: "award_criterion", label: "Criterio di aggiudicazione (per le negoziate)", type: "select", options: [{ value: "LOWEST_PRICE", label: "Minor prezzo" }, { value: "MEAT", label: "Offerta economicamente più vantaggiosa" }] },
            { name: "programmed", label: "Importo programmato (IVA inclusa)", type: "amount", required: true },
            { name: "y2026", label: "Riparto 2026", type: "amount" },
            { name: "y2027", label: "Riparto 2027", type: "amount" },
            { name: "y2028", label: "Riparto 2028", type: "amount" },
            { name: "y2029", label: "Riparto 2029", type: "amount", help: "La somma del riparto deve coincidere con il programmato." },
            { name: "memory_due", label: "Data obiettivo della memoria", type: "date", required: true, defaultValue: configuredReferenceDate(db()) },
          ]}
        />
      </section>
    </>
  );
}
