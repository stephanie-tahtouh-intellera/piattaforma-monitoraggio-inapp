import { existsSync, readFileSync } from "node:fs";
import { DomainError } from "@/application/errors";
import { documentFile } from "@/application/documents";
import { requireProcedure } from "@/server/authz";
import { route } from "@/server/http";

export const runtime = "nodejs";
/** Download controllato (US-081): permessi della procedura, nessun path fisico esposto. */
export const GET = route(({ db, actor, params }) => {
  const doc = db.prepare("SELECT d.*, p.code FROM documents d JOIN procedures p ON p.id = d.procedure_id WHERE d.id = ?").get(Number(params.id)) as Record<string, any> | undefined;
  if (!doc) throw new DomainError("NOT_FOUND", "Documento non trovato", 404);
  requireProcedure(db, actor!, doc.code);
  const full = documentFile(String(doc.file_path));
  if (!existsSync(full)) throw new DomainError("NOT_FOUND", "File non disponibile", 404);
  const isPdf = String(doc.file_name).toLowerCase().endsWith(".pdf");
  return new Response(new Uint8Array(readFileSync(full)), {
    headers: {
      "content-type": isPdf ? "application/pdf" : "application/octet-stream",
      "content-disposition": `${isPdf ? "inline" : "attachment"}; filename="${String(doc.file_name).replace(/[^a-zA-Z0-9._ -]/g, "_")}"`,
      "x-content-type-options": "nosniff",
    },
  });
});
