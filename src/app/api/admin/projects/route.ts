import { z } from "zod";
import { createProject } from "@/server/admin-commands";
import { body, route } from "@/server/http";

export const runtime = "nodejs";
const B = z.object({ code: z.string().min(2).max(32), name: z.string().min(3).max(200) });
/** DEC-111 (incremento 4): aggiunge un progetto al catalogo (amministratore). */
export const POST = route(async ({ db, actor, req }) => {
  const b = await body(req, B);
  return createProject(db, actor!, b.code, b.name);
});
