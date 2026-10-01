import { route } from "@/server/http";
import { systemStatus } from "@/server/queries";

export const runtime = "nodejs";
export const GET = route(({ db }) => systemStatus(db));
