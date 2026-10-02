import { z } from "zod";
import { body, route } from "@/server/http";
import { updateEngineSettings } from "@/server/admin-commands";

export const runtime = "nodejs";
const N = z.coerce.number().int();
const B = z.object({ attentionWindowDays: N, reminderThresholdDays: N, salReviewTermDays: N, paymentTermDays: N, extraHolidays: z.string().max(2000).optional() });
export const PUT = route(async ({ db, actor, req }) => {
  const b = await body(req, B);
  const extra = b.extraHolidays === undefined ? undefined : b.extraHolidays.split(/[\s,;]+/).filter(Boolean);
  return updateEngineSettings(db, actor!, { attentionWindowDays: b.attentionWindowDays, reminderThresholdDays: b.reminderThresholdDays, salReviewTermDays: b.salReviewTermDays, paymentTermDays: b.paymentTermDays }, extra);
});
