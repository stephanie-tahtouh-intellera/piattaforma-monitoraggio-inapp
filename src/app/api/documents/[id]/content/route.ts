import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DomainError } from "@/application/errors";
import { projectRoot } from "@/infrastructure/config/templates";
import { requireProcedure } from "@/server/authz";
import { route } from "@/server/http";

export const runtime = "nodejs";
/** Download controllato (US-081): permessi della procedura, nessun path fisico esposto. */
export const GET = route(({ db, actor, params }) => {
  const doc = db.prepare("SELECT d.*, p.code FROM documents d JOIN procedures p ON p.id = d.procedure_id WHERE d.id = ?").get(Number(params.id)) as Record<string, any> | undefined;
  if (!doc) throw new DomainError("NOT_FOUND", "Documento non trovato", 404);
  requireProcedure(db, actor!, doc.code);
  const root = projectRoot();
  const rel = String(doc.file_path);
  const full = rel.startsWith("inapp:") ? path.join(root, "seed", "inapp", "documenti", path.basename(rel.slice(6))) : path.join(root, "seed", "scenarios", "documents", ...rel.split("/").filter((x) => x && x !== ".."));
  if (!existsSync(full)) throw new DomainError("NOT_FOUND", "File non disponibile", 404);
  return new Response(new Uint8Array(readFileSync(full)), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${String(doc.file_name).replace(/[^a-zA-Z0-9._ -]/g, "_")}"`, "x-content-type-options": "nosniff" } });
});
