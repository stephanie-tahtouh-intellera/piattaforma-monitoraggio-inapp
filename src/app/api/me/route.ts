import { route } from "@/server/http";
import { ROLE_LABEL } from "@/server/authz";

export const runtime = "nodejs";
export const GET = route(({ actor }) => ({
  login: actor!.login,
  name: actor!.name,
  role: actor!.role,
  roleLabel: ROLE_LABEL[actor!.role],
  structureScope: actor!.structureScope,
  supplier: actor!.supplierCode,
  impersonatedBy: actor!.impersonatedBy,
}));
