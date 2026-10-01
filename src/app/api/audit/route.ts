import { route } from "@/server/http";
import { auditList } from "@/server/queries";
import { require as requireAction } from "@/server/authz";

export const runtime = "nodejs";
export const GET = route(({ db, actor, req }) => {
  requireAction(actor, "audit.read");
  const u = new URL(req.url);
  return { items: auditList(db, { procedure: u.searchParams.get("procedure") ?? undefined, actor: u.searchParams.get("actor") ?? undefined, action: u.searchParams.get("action") ?? undefined }) };
});
