import { route } from "@/server/http";
import { procedureDetail } from "@/server/queries";

export const runtime = "nodejs";
export const GET = route(async ({ db, actor, params }) => {
  const d = await procedureDetail(db, actor!, params.code!);
  return { referenceDate: d.referenceDate, items: d.timeline };
});
