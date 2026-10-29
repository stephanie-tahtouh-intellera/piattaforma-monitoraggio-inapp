import { z } from "zod";
import { body, route } from "@/server/http";
import { registerPayment } from "@/server/commands";

export const runtime = "nodejs";
const B = z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Importo non valido"), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reference: z.string().max(200).optional() });
export const POST = route(async ({ db, actor, req, params }) => {
  const b = await body(req, B);
  await registerPayment(db, actor!, params.code!, Number(params.seq), b.amount, b.date, b.reference ?? null);
  return { ok: true };
});
