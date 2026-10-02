import { DomainError } from "@/application/errors";
import { requireProcedure } from "@/server/authz";
import { route } from "@/server/http";

export const runtime = "nodejs";
export const GET = route(({ db, actor, params }) => {
  const doc = db.prepare("SELECT d.id, d.file_name, p.code FROM documents d JOIN procedures p ON p.id = d.procedure_id WHERE d.id = ?").get(Number(params.id)) as Record<string, any> | undefined;
  if (!doc) throw new DomainError("NOT_FOUND", "Documento non trovato", 404);
  requireProcedure(db, actor!, doc.code);
  return { document: doc.file_name, pages: db.prepare("SELECT page_no, method, confidence, text FROM document_pages WHERE document_id = ? ORDER BY page_no").all(doc.id) };
});
