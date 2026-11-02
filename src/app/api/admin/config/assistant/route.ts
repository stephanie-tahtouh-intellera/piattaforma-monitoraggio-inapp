import { z } from "zod";
import { MEMORY_ASSISTANT_PROVIDERS, setMemoryAssistantProvider } from "@/application/memory-assistant";
import { systemNowIso } from "@/infrastructure/clock";
import { tx } from "@/infrastructure/db/connection";
import { require as requireAction } from "@/server/authz";
import { body, route } from "@/server/http";

export const runtime = "nodejs";
const B = z.object({ provider: z.enum(MEMORY_ASSISTANT_PROVIDERS as [string, ...string[]]) });
/** DEC-111 (incremento 6): attiva o disattiva l'assistente alla memoria. */
export const PUT = route(async ({ db, actor, req }) => {
  requireAction(actor, "admin");
  const b = await body(req, B);
  await tx(db, (tdb) => setMemoryAssistantProvider(tdb, b.provider as "disabled" | "template", actor!.login, systemNowIso()));
  return { provider: b.provider };
});
