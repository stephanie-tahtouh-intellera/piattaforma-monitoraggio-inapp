import { route } from "@/server/http";
import { listProcedures } from "@/server/queries";

export const runtime = "nodejs";
export const GET = route(({ db, actor, req }) => {
  const u = new URL(req.url);
  const g = (k: string) => u.searchParams.get(k) ?? undefined;
  return listProcedures(db, actor!, {
    q: g("q"), health: g("health"), status: g("status"), structure: g("structure"), type: g("type"), year: g("year"),
    reschedule: g("reschedule"), alerts: g("alerts"), sort: g("sort"), dir: g("dir"), page: Number(g("page") ?? 1), size: Number(g("size") ?? 25),
  });
});
