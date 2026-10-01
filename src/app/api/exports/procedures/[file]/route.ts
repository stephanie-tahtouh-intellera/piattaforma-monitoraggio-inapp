import { DomainError } from "@/application/errors";
import { route } from "@/server/http";
import { procedurePdf } from "@/server/exports";

export const runtime = "nodejs";
export const GET = route(async ({ db, actor, params }) => {
  const code = params.file!.replace(/\.pdf$/i, "");
  if (!/^[A-Z0-9-]+$/i.test(code)) throw new DomainError("VALIDATION_ERROR", "Codice non valido", 422);
  const { buf, sha } = await procedurePdf(db, actor!, code);
  return new Response(new Uint8Array(buf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="report_${code}_DEMO.pdf"`, "x-export-sha256": sha } });
});
