import { route } from "@/server/http";
import { markNotificationsRead } from "@/server/commands";

export const runtime = "nodejs";
export const POST = route(async ({ db, actor }) => {
  await markNotificationsRead(db, actor!);
  return { ok: true };
});
