import { addDays, addMonths, type IsoDate } from "./dates";
import type { Deadline } from "./milestones";
import type { Severity } from "./model";

/** Destinatario logico (DEC-062): OWNER si risolve sull'owner della scadenza. */
export type RecipientSpec = "OWNER" | "STRUCTURE" | "PROCUREMENT" | "FINANCE" | "EXECUTIVE";
export type Channel = "IN_APP" | "EMAIL";

export interface LevelDef {
  level: string; // "T-1M", "T-10", "T-5", "T-2", "T0", "T+1"
  severity: Severity;
  recipients: RecipientSpec[];
  channels: Channel[];
}

export interface AlertPolicy {
  code: string;
  rule: "MILESTONE_DEADLINE" | "SAL_DEADLINE" | "PAYMENT_DEADLINE";
  levels: LevelDef[];
}

const BOTH: Channel[] = ["IN_APP", "EMAIL"];
const APP: Channel[] = ["IN_APP"];

/** Policy di default (guida §8.3), sovrascrivibili da config/alert_policies. */
export const DEFAULT_POLICIES: Record<string, AlertPolicy> = {
  MEMORY: {
    code: "MEMORY",
    rule: "MILESTONE_DEADLINE",
    levels: [
      { level: "T-1M", severity: "LOW", recipients: ["OWNER"], channels: APP },
      { level: "T-10", severity: "LOW", recipients: ["OWNER"], channels: APP },
      { level: "T-5", severity: "HIGH", recipients: ["OWNER"], channels: BOTH },
      { level: "T-2", severity: "HIGH", recipients: ["OWNER", "PROCUREMENT"], channels: BOTH },
      { level: "T0", severity: "HIGH", recipients: ["OWNER", "PROCUREMENT", "EXECUTIVE"], channels: BOTH },
      { level: "T+1", severity: "CRITICAL", recipients: ["OWNER", "PROCUREMENT", "EXECUTIVE"], channels: BOTH },
    ],
  },
  BLOCKING: {
    code: "BLOCKING",
    rule: "MILESTONE_DEADLINE",
    levels: [
      { level: "T-5", severity: "MEDIUM", recipients: ["OWNER", "PROCUREMENT"], channels: BOTH },
      { level: "T0", severity: "HIGH", recipients: ["OWNER", "PROCUREMENT"], channels: BOTH },
      { level: "T+1", severity: "CRITICAL", recipients: ["OWNER", "PROCUREMENT", "EXECUTIVE"], channels: BOTH },
    ],
  },
  STANDARD: {
    code: "STANDARD",
    rule: "MILESTONE_DEADLINE",
    levels: [
      { level: "T-5", severity: "LOW", recipients: ["OWNER"], channels: APP },
      { level: "T+1", severity: "MEDIUM", recipients: ["OWNER"], channels: APP },
    ],
  },
  SAL: {
    code: "SAL",
    rule: "SAL_DEADLINE",
    levels: [
      { level: "T-5", severity: "MEDIUM", recipients: ["STRUCTURE", "PROCUREMENT"], channels: BOTH },
      { level: "T0", severity: "HIGH", recipients: ["STRUCTURE", "PROCUREMENT"], channels: BOTH },
      { level: "T+1", severity: "CRITICAL", recipients: ["STRUCTURE", "PROCUREMENT", "EXECUTIVE"], channels: BOTH },
    ],
  },
  PAYMENT: {
    code: "PAYMENT",
    rule: "PAYMENT_DEADLINE",
    levels: [
      { level: "T-5", severity: "MEDIUM", recipients: ["FINANCE"], channels: BOTH },
      { level: "T0", severity: "HIGH", recipients: ["FINANCE"], channels: BOTH },
      { level: "T+1", severity: "CRITICAL", recipients: ["FINANCE", "EXECUTIVE"], channels: BOTH },
    ],
  },
};

export const RESCHEDULE_REQUIRED_LEVEL: LevelDef = {
  level: "FLAG",
  severity: "HIGH",
  recipients: ["PROCUREMENT", "FINANCE"],
  channels: BOTH,
};

export const BUDGET_OVERFLOW_LEVEL: LevelDef = {
  level: "FLAG",
  severity: "CRITICAL",
  recipients: ["FINANCE", "EXECUTIVE"],
  channels: BOTH,
};

/** Data in cui un livello si attiva per una scadenza. */
export function levelTrigger(due: IsoDate, level: string): IsoDate {
  if (level === "T0") return due;
  const months = /^T-(\d+)M$/.exec(level);
  if (months) return addMonths(due, -Number(months[1]));
  const m = /^T([+-])(\d+)$/.exec(level);
  if (!m) throw new Error(`Livello non riconosciuto: ${level}`);
  const n = Number(m[2]);
  return addDays(due, m[1] === "-" ? -n : n);
}

/** Livello più alto raggiunto alla data di riferimento (DEC-011). */
export function highestLevel(policy: AlertPolicy, due: IsoDate, ref: IsoDate): LevelDef | null {
  let best: { def: LevelDef; trig: IsoDate } | null = null;
  for (const def of policy.levels) {
    const trig = levelTrigger(due, def.level);
    if (trig <= ref && (!best || trig >= best.trig)) best = { def, trig };
  }
  return best?.def ?? null;
}

export interface AlertCandidate {
  rule: string;
  targetType: "MILESTONE" | "SAL" | "PROCEDURE";
  target: string;
  dueDate: IsoDate | null;
  level: LevelDef;
  owner: string;
  title: string;
  blocking: boolean;
}

export function deadlineAlerts(
  deadlines: Deadline[],
  ref: IsoDate,
  policies: Record<string, AlertPolicy> = DEFAULT_POLICIES,
): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  for (const d of deadlines) {
    const policy = policies[d.policy];
    if (!policy) continue;
    const lvl = highestLevel(policy, d.due, ref);
    if (!lvl) continue;
    out.push({
      rule: policy.rule,
      targetType: d.kind === "MILESTONE" ? "MILESTONE" : "SAL",
      target: d.target,
      dueDate: d.due,
      level: lvl,
      owner: d.owner,
      title: d.label,
      blocking: d.blocking,
    });
  }
  return out;
}

export const SEVERITY_RANK: Record<Severity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
