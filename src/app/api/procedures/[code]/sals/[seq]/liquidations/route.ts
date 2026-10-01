import { z } from "zod";
import { body, route } from "@/server/http";
import { liquidateSal } from "@/server/commands";

export const runtime = "nodejs";
const B = z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Importo non valido"), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
export const POST = route(async ({ db, actor, req, params }) => {
  const b = await body(req, B);
  liquidateSal(db, actor!, params.code!, Number(params.seq), b.amount, b.date);
  return { ok: true };
});
