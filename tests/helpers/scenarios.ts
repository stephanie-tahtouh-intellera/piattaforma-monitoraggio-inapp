import { readFileSync } from "node:fs";
import path from "node:path";
import { buildAggregateFromSeed } from "@/application/build-aggregate";
import { SeedDataset } from "@/contracts/seed";
import { BusinessCalendar, isoDate } from "@/domain/dates";
import { DEFAULT_SETTINGS, type ProcedureAggregate } from "@/domain/model";
import { loadTemplates } from "@/infrastructure/config/templates";

export const REF = isoDate("2026-10-01");
export const cal = new BusinessCalendar();
export const root = path.resolve(__dirname, "../..");

export function loadScenarioSeed() {
  return SeedDataset.parse(JSON.parse(readFileSync(path.join(root, "seed/scenarios/procedures.json"), "utf8")));
}
export function loadOracle(): any {
  return JSON.parse(readFileSync(path.join(root, "seed/scenarios/expected_results.json"), "utf8"));
}
export function scenarioAggregates(): Map<string, ProcedureAggregate> {
  const templates = loadTemplates(path.join(root, "config/templates"));
  const seed = loadScenarioSeed();
  return new Map(
    seed.procedures.map((p) => [p.code, buildAggregateFromSeed(p, templates, cal, DEFAULT_SETTINGS)]),
  );
}
