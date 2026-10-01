import { EXAMPLES } from "@/server/assistant";
import { pageActor } from "@/server/page";
import { AssistantChat } from "@/ui/assistant-chat";

export const metadata = { title: "Assistente" };

export default async function AssistantPage() {
  await pageActor();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Assistente</h1>
          <div className="page-meta">
            Risponde con regole deterministiche e fonti cliccabili; rispetta i tuoi permessi e non modifica dati. Provider IA: disattivato (il prodotto funziona senza IA).
          </div>
        </div>
      </div>
      <AssistantChat examples={EXAMPLES} />
    </>
  );
}
