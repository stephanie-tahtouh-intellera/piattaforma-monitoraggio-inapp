import { processPendingDocuments } from "@/application/documents";
import { require as requireAction } from "@/server/authz";
import { route } from "@/server/http";

export const runtime = "nodejs";
export const POST = route(async ({ db, actor }) => {
  requireAction(actor, "documents.import");
  return processPendingDocuments(db, actor!.login);
});
