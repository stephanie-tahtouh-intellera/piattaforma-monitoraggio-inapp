import { route } from "@/server/http";
import { validationQueue } from "@/server/queries";
import { require as requireAction } from "@/server/authz";

export const runtime = "nodejs";
export const GET = route(({ db, actor, req }) => {
  requireAction(actor, "validation.decide");
  return { items: validationQueue(db, actor!, new URL(req.url).searchParams.get("status") ?? "OPEN") };
});
