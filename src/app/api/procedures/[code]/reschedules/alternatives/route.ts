import { route } from "@/server/http";
import { previewAlternatives } from "@/server/queries";
import { serializeSimulation } from "@/domain/reschedule";
import { isoDate } from "@/domain/dates";
import { require as requireAction } from "@/server/authz";

export const runtime = "nodejs";
export const GET = route(({ db, actor, req, params }) => {
  requireAction(actor, "simulation.create");
  const u = new URL(req.url);
  const manual = u.searchParams.get("candidate");
  const alts = previewAlternatives(db, actor!, params.code!, u.searchParams.get("source") ?? "", manual ? isoDate(manual) : null);
  return { alternatives: alts.map((a) => ({ kind: a.kind, sameAs: a.sameAs, explanation: a.explanation, result: serializeSimulation(a.result) })) };
});
