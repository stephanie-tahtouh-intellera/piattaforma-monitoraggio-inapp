import { processPendingDocuments } from "@/application/documents";
import { require as requireAction } from "@/server/authz";
import { route } from "@/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;
/** Elabora i documenti in attesa dell'intero portafoglio (uso amministrativo e worker); per una sola procedura c'è /api/procedures/[code]/documents/process (DEC-143). */
export const POST = route(async ({ db, actor }) => {
  requireAction(actor, "documents.import");
  return processPendingDocuments(db, actor!.login);
});
