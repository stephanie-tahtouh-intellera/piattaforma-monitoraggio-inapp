import { route } from "@/server/http";
import { alertsList } from "@/server/queries";

export const runtime = "nodejs";
export const GET = route(({ db, actor, req }) => {
  const u = new URL(req.url);
  const g = (k: string) => u.searchParams.get(k) ?? undefined;
  return alertsList(db, actor!, { view: g("view"), kind: g("kind"), severity: g("severity"), status: g("status"), procedure: g("procedure"), rule: g("rule") });
});
