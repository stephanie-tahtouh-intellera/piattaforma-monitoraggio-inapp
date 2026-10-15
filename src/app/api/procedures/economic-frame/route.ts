import { z } from "zod";
import { DomainError } from "@/application/errors";
import { computeEconomicFrame, frameToJson, parsePct } from "@/domain/economic-frame";
import { Money } from "@/domain/money";
import { body, route } from "@/server/http";
import { require as requireAction } from "@/server/authz";

export const runtime = "nodejs";
const amount = z.string().regex(/^\d+(\.\d{1,2})?$/, "Importo non valido");
const pct = z.string().regex(/^\d+([.,]\d{1,2})?$/, "Percentuale non valida");
const B = z.object({ base: amount, vat_pct: pct.optional(), anac_fee: amount.optional(), has_dec: z.boolean().optional(), incentive_pct: pct.optional() });

/** Anteprima del quadro economico (DEC-111): calcolo deterministico nel dominio, nessuna scrittura. */
export const POST = route(async ({ actor, req }) => {
  requireAction(actor, "procedure.draft");
  const b = await body(req, B);
  try {
    const f = computeEconomicFrame({
      base: Money.parse(b.base),
      ...(b.vat_pct ? { vatPct: parsePct(b.vat_pct) } : {}),
      anacFee: Money.parse(b.anac_fee ?? "0"),
      hasDec: b.has_dec ?? false,
      ...(b.incentive_pct ? { incentivePct: parsePct(b.incentive_pct) } : {}),
    });
    return frameToJson(f);
  } catch (e) {
    throw new DomainError("VALIDATION_ERROR", e instanceof Error ? e.message : "Dati non validi", 422);
  }
});
