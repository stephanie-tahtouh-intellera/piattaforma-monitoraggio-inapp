import { z } from "zod";
import { DomainError } from "@/application/errors";
import { economicSettings } from "@/application/economic-settings";
import { computeEconomicFrame, frameToJson, parsePct } from "@/domain/economic-frame";
import { Money } from "@/domain/money";
import { body, route } from "@/server/http";
import { require as requireAction } from "@/server/authz";

export const runtime = "nodejs";
const amount = z.string().regex(/^\d+(\.\d{1,2})?$/, "Importo non valido");
const pct = z.string().regex(/^\d+([.,]\d{1,2})?$/, "Percentuale non valida");
const B = z.object({
  base: amount,
  vat_pct: pct.optional(),
  anac_fee: amount.optional(),
  incentives_decision: z.enum(["YES", "NO", "TO_VERIFY"]).optional(),
  incentive_pct: pct.optional(),
});

/** Anteprima del quadro economico: calcolo deterministico nel dominio, nessuna scrittura. */
export const POST = route(async ({ db, actor, req }) => {
  requireAction(actor, "procedure.draft");
  const b = await body(req, B);
  try {
    const settings = await economicSettings(db);
    const f = computeEconomicFrame({
      base: Money.parse(b.base),
      ...(b.vat_pct ? { vatPct: parsePct(b.vat_pct) } : {}),
      anacFee: Money.parse(b.anac_fee ?? "0"),
      incentivesDecision: b.incentives_decision ?? "TO_VERIFY",
      ...(b.incentive_pct ? { incentivePct: parsePct(b.incentive_pct) } : {}),
      incentivesReduceAvailable: settings.incentivesReduceAvailable,
    });
    return frameToJson(f);
  } catch (e) {
    throw new DomainError("VALIDATION_ERROR", e instanceof Error ? e.message : "Dati non validi", 422);
  }
});
