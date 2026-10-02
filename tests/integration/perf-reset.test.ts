import { describe, expect, test } from "vitest";
import { resetDemo } from "@/application/bootstrap";
import { runChecks } from "@/application/run-checks";
import { readDataset, seedDataset } from "@/application/seed-loader";
import { isoDate } from "@/domain/dates";
import { simulate } from "@/domain/reschedule";
import { BusinessCalendar } from "@/domain/dates";
import { login } from "@/server/auth";
import { listProcedures, dashboard } from "@/server/queries";
import { loadAggregate } from "@/infrastructure/repo/procedures";
import { clock, scenarioDb } from "../helpers/db";
import { root } from "../helpers/scenarios";
import path from "node:path";

const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.95) - 1]!;

describe("[T-022][US-112] reset della demo", () => {
  test("il reset ripristina lo stato del seed e resta auditato", async () => {
    const db = await scenarioDb();
    db.prepare("UPDATE alerts SET status = 'RESOLVED' WHERE id IN (SELECT id FROM alerts LIMIT 3)").run();
    await resetDemo(db, clock, "admin", "scenarios");
    expect((db.prepare("SELECT COUNT(*) n FROM procedures").get() as any).n).toBe(12);
    expect((db.prepare("SELECT COUNT(*) n FROM alerts WHERE kind='ALERT' AND status='OPEN'").get() as any).n).toBe(9);
    expect((db.prepare("SELECT COUNT(*) n FROM alert_notifications").get() as any).n).toBe(36);
    expect((db.prepare("SELECT action FROM audit_events ORDER BY id DESC LIMIT 1").get() as any).action).toBe("RESET_DEMO");
  });
});

describe("[NFR-002][NFR-003] prestazioni con 1.000 procedure", () => {
  test("portafoglio p95 ≤ 2 s e simulazione ≤ 3 s", async () => {
    const db = await scenarioDb();
    const base = readDataset(path.join(root, "seed/scenarios/procedures.json"));
    const procedures = [];
    for (let i = 0; procedures.length < 988; i++) {
      for (const p of base.procedures) {
        if (procedures.length >= 988) break;
        procedures.push({ ...p, code: `PERF-${String(procedures.length + 1).padStart(4, "0")}`, title: `${p.title} (${i})`, documents: [], extractionProposals: [], events: p.events });
      }
    }
    const rep = seedDataset(db, { dataset: "perf", procedures }, clock, null);
    expect(rep.inserted).toBe(988);
    runChecks(db, clock);
    expect((db.prepare("SELECT COUNT(*) n FROM procedure_snapshot").get() as any).n).toBe(1000);
    const actor = login(db, "dirigente", "Demo2026!").actor;
    const times: number[] = [];
    const filters = [{}, { health: "RED" }, { year: "2027", sort: "risk", dir: "desc" }, { q: "servizi" }, { status: "EXECUTION", page: 3 }];
    for (let k = 0; k < 40; k++) {
      const t0 = performance.now();
      listProcedures(db, actor, filters[k % filters.length]!);
      times.push(performance.now() - t0);
    }
    const t1 = performance.now();
    dashboard(db, actor);
    const dash = performance.now() - t1;
    const pid = (db.prepare("SELECT id FROM procedures WHERE code='P-002'").get() as { id: number }).id;
    const t2 = performance.now();
    simulate(loadAggregate(db, pid), "MEMORY_SUBMISSION", isoDate("2026-11-16"), isoDate("2026-10-01"), new BusinessCalendar());
    const sim = performance.now() - t2;
    console.log(`portafoglio p95 ${p95(times).toFixed(1)} ms · dashboard ${dash.toFixed(1)} ms · simulazione ${sim.toFixed(1)} ms`);
    expect(p95(times)).toBeLessThan(2000);
    expect(sim).toBeLessThan(3000);
  }, 300000);
});
