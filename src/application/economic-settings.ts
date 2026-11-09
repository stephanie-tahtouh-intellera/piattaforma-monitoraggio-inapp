import type { Db } from "@/infrastructure/db/connection";

export interface EconomicSettings {
  incentivesReduceAvailable: boolean;
}

export const DEFAULT_ECONOMIC_SETTINGS: EconomicSettings = {
  incentivesReduceAvailable: false,
};

export async function economicSettings(db: Db): Promise<EconomicSettings> {
  const row = (await db.prepare("SELECT value_json FROM config WHERE key = 'economic.settings'").get()) as { value_json: string } | undefined;
  if (!row) return DEFAULT_ECONOMIC_SETTINGS;
  const value: unknown = JSON.parse(row.value_json);
  if (typeof value !== "object" || value === null || typeof (value as Record<string, unknown>).incentivesReduceAvailable !== "boolean") {
    throw new Error("Configurazione economic.settings non valida");
  }
  return { incentivesReduceAvailable: (value as { incentivesReduceAvailable: boolean }).incentivesReduceAvailable };
}
