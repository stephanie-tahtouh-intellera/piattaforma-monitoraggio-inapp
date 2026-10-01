import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { TemplateSchema } from "@/contracts/seed";
import type { ProcessTemplate } from "@/domain/model";

let cache: ProcessTemplate[] | null = null;

export function projectRoot(): string {
  return process.env.APP_ROOT ?? process.cwd();
}

/** Carica e valida i modelli di procedura da config/templates/*.yaml (US-100). */
export function loadTemplates(dir = path.join(projectRoot(), "config", "templates")): ProcessTemplate[] {
  if (cache) return cache;
  const out: ProcessTemplate[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".yaml")).sort()) {
    const raw = YAML.parse(readFileSync(path.join(dir, f), "utf8"));
    const t = TemplateSchema.parse(raw);
    const codes = new Set<string>();
    for (const m of t.milestones) {
      if (codes.has(m.code)) throw new Error(`Modello ${t.code}: milestone duplicata ${m.code}`);
      codes.add(m.code);
    }
    out.push(t as unknown as ProcessTemplate);
  }
  cache = out;
  return out;
}

export function templateByCode(code: string): ProcessTemplate {
  const t = loadTemplates().find((x) => x.code === code);
  if (!t) throw new Error(`Modello non trovato: ${code}`);
  return t;
}
