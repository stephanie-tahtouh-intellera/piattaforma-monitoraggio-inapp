import { proposeMemoryText } from "@/server/admin-commands";
import { route } from "@/server/http";

export const runtime = "nodejs";
/** DEC-111 (incremento 6): testo proposto per la memoria (assistente opzionale, spento di default). */
export const POST = route(async ({ db, actor, params }) => proposeMemoryText(db, actor!, params.code!));
