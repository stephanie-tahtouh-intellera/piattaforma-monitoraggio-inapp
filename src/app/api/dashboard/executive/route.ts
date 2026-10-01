import { route } from "@/server/http";
import { dashboard } from "@/server/queries";

export const runtime = "nodejs";
export const GET = route(({ db, actor, req }) => {
  const u = new URL(req.url);
  return dashboard(db, actor!, { structure: u.searchParams.get("structure") ?? undefined });
});
