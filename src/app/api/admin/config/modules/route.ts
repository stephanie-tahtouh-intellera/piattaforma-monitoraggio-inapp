import { z } from "zod";
import { setExecutionModule } from "@/application/modules";
import { tx } from "@/infrastructure/db/connection";
import { systemNowIso } from "@/infrastructure/clock";
import { require as requireAction } from "@/server/authz";
import { body, route } from "@/server/http";

export const runtime = "nodejs";
const B = z.object({ execution: z.boolean() });
/** DEC-108: mostra o nasconde il Modulo 2 (esecuzione e rendicontazione). */
export const PUT = route(async ({ db, actor, req }) => {
  requireAction(actor, "admin");
  const b = await body(req, B);
  await tx(db, (tdb) => setExecutionModule(tdb, b.execution, actor!.login, systemNowIso()));
  return { execution: b.execution };
});
