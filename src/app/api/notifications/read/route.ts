import { route } from "@/server/http";
import { markNotificationsRead } from "@/server/commands";

export const runtime = "nodejs";
export const POST = route(({ db, actor }) => {
  markNotificationsRead(db, actor!);
  return { ok: true };
});
