import { z } from "zod";
import { body, route } from "@/server/http";
import { listProcedures } from "@/server/queries";
import { createDraft } from "@/server/admin-commands";

export const runtime = "nodejs";
export const GET = route(({ db, actor, req }) => {
  const u = new URL(req.url);
  const g = (k: string) => u.searchParams.get(k) ?? undefined;
  return listProcedures(db, actor!, {
    q: g("q"), health: g("health"), status: g("status"), structure: g("structure"), type: g("type"), year: g("year"),
    reschedule: g("reschedule"), alerts: g("alerts"), sort: g("sort"), dir: g("dir"), page: Number(g("page") ?? 1), size: Number(g("size") ?? 25),
  });
});

const Draft = z.object({
  title: z.string().min(5).max(300),
  type: z.enum(["DIRECT_AWARD", "DIRECT_AWARD_MEPA", "MEPA_ORDER", "CENTRAL_PURCHASING_ORDER", "NEGOTIATED", "OPEN", "FRAMEWORK_AGREEMENT"]),
  award_criterion: z.enum(["LOWEST_PRICE", "MEAT"]).optional(),
  programmed: z.string().regex(/^\d+(\.\d{1,2})?$/, "Importo non valido"),
  memory_due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  y2026: z.string().regex(/^\d+(\.\d{1,2})?$/, "Importo non valido").optional(), y2027: z.string().regex(/^\d+(\.\d{1,2})?$/, "Importo non valido").optional(), y2028: z.string().regex(/^\d+(\.\d{1,2})?$/, "Importo non valido").optional(), y2029: z.string().regex(/^\d+(\.\d{1,2})?$/, "Importo non valido").optional(),
});
/** US-013: creazione bozza (Struttura). */
export const POST = route(async ({ db, actor, req }) => {
  const b = await body(req, Draft);
  const r = createDraft(db, actor!, {
    title: b.title, type: b.type, awardCriterion: b.award_criterion, programmed: b.programmed, memoryDue: b.memory_due,
    annual: { "2026": b.y2026 ?? "", "2027": b.y2027 ?? "", "2028": b.y2028 ?? "", "2029": b.y2029 ?? "" },
  });
  return { ...r, redirect: `/procedure/${r.code}` };
});
