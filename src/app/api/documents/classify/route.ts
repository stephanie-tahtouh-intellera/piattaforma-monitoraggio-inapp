import { z } from "zod";
import { classifyDocument } from "@/server/commands";
import { body, route } from "@/server/http";

export const runtime = "nodejs";
const B = z.object({
  document_id: z.coerce.number().int().positive(),
  doc_type: z.string().max(60).optional(),
  procedure: z.string().max(40).optional(),
  note: z.string().max(2000).optional(),
});
/** Correzione della classificazione di un documento (DEC-109): tipo di atto ed eventuale altra procedura. */
export const POST = route(async ({ db, actor, req }) => {
  const b = await body(req, B);
  classifyDocument(db, actor!, b.document_id, b.doc_type?.trim() || null, b.procedure?.trim() || null, b.note ?? null);
  return { ok: true };
});
