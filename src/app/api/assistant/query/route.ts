import { z } from "zod";
import { ask } from "@/server/assistant";
import { body, route } from "@/server/http";

export const runtime = "nodejs";
export const POST = route(async ({ db, actor, req }) => ask(db, actor!, (await body(req, z.object({ question: z.string().min(1).max(500) }))).question));
