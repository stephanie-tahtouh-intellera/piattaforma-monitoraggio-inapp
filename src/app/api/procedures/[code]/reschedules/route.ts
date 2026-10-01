import { route } from "@/server/http";
import { procedureDetail } from "@/server/queries";

export const runtime = "nodejs";
export const GET = route(({ db, actor, params }) => {
  const d = procedureDetail(db, actor!, params.code!);
  return { simulations: d.simulations, versions: d.versions };
});
