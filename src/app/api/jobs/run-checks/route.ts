import { route } from "@/server/http";
import { adminRunChecks } from "@/server/commands";

export const runtime = "nodejs";
export const POST = route(({ db, actor }) => adminRunChecks(db, actor!));
