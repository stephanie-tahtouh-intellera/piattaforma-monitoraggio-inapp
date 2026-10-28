import { DomainError } from "@/application/errors";
import { MAX_UPLOAD_BYTES, processDocument, storeUpload } from "@/application/documents";
import { procedureDetail } from "@/server/queries";
import { require as requireAction, requireProcedure } from "@/server/authz";
import { route } from "@/server/http";

export const runtime = "nodejs";
export const GET = route(async ({ db, actor, params }) => ({ items: (await procedureDetail(db, actor!, params.code!)).documents }));

/** Upload (US-020, US-112): PDF/XLSX/ZIP, limiti e firma del contenuto; elaborazione testo/OCR subito. */
export const POST = route(async ({ db, actor, req, params }) => {
  const a = actor!;
  if (!(a.role === "SUPPLIER" || a.role === "STRUCTURE_USER" || a.role === "PROCUREMENT_OFFICER")) requireAction(a, "documents.import");
  const p = await requireProcedure(db, a, params.code!);
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_UPLOAD_BYTES * 1.1) throw new DomainError("UPLOAD_REJECTED", "File oltre il limite di 20 MB", 413);
  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => typeof f !== "string");
  if (!files.length) throw new DomainError("VALIDATION_ERROR", "Nessun file", 422);
  const out = { stored: [] as number[], rejected: [] as string[], processed: [] as unknown[] };
  for (const f of files) {
    const r = await storeUpload(db, a.login, p.id, p.code, f.name, Buffer.from(await f.arrayBuffer()));
    out.stored.push(...r.stored);
    out.rejected.push(...r.rejected);
  }
  for (const id of out.stored) out.processed.push(await processDocument(db, id, a.login));
  return out;
});
