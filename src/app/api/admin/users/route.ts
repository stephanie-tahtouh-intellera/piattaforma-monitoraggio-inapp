import { z } from "zod";
import { body, route } from "@/server/http";
import { upsertUser } from "@/server/admin-commands";
import { require as requireAction } from "@/server/authz";

export const runtime = "nodejs";
export const GET = route(({ db, actor }) => {
  requireAction(actor, "admin");
  return { items: db.prepare("SELECT login, name, role, structure_scope, supplier_code, active FROM users ORDER BY id").all() };
});
const B = z.object({
  login: z.string(), name: z.string().min(2).max(120),
  role: z.enum(["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "SUPPLIER", "EXECUTIVE", "ADMIN"]),
  structure_scope: z.string().max(60).default("*"), supplier: z.string().max(40).optional(), active: z.boolean().default(true),
});
export const POST = route(async ({ db, actor, req }) => {
  const b = await body(req, B);
  await upsertUser(db, actor!, { login: b.login, name: b.name, role: b.role, structureScope: b.structure_scope, supplier: b.supplier ?? null, active: b.active });
  return { ok: true };
});
