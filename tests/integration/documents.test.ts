import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { crc32 } from "node:zlib";
import { beforeAll, describe, expect, test } from "vitest";
import { extractFields, processDocument, sniff, storeUpload } from "@/application/documents";
import { isoDate } from "@/domain/dates";
import { evaluateProcedure } from "@/domain/evaluate";
import { DEFAULT_SETTINGS } from "@/domain/model";
import type { Db } from "@/infrastructure/db/connection";
import { ocrPdfPages } from "@/infrastructure/documents/ocr";
import { scenarioDb } from "../helpers/db";
import { REF, root, scenarioAggregates } from "../helpers/scenarios";

process.env.STORAGE_PATH = mkdtempSync(path.join(os.tmpdir(), "inapp-storage-"));
let db: Db;
beforeAll(async () => {
  db = await scenarioDb();
});
const realPdf = (f: string) => readFileSync(path.join(root, "seed", "inapp", "documenti", f));

/** ZIP minimo (metodo "stored") per i fixture di sicurezza. */
function zip(entries: { name: string; data: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name);
    const crc = crc32(e.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(e.data.length, 18); local.writeUInt32LE(e.data.length, 22); local.writeUInt16LE(name.length, 26);
    parts.push(local, name, e.data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(e.data.length, 20); c.writeUInt32LE(e.data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, name);
    offset += 30 + name.length + e.data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

describe("[US-112] protezione degli upload", () => {
  test("estensione e contenuto devono coincidere", () => {
    expect(sniff("a.pdf", Buffer.from("%PDF-1.7 ..."))).toBe("PDF");
    expect(() => sniff("virus.pdf", Buffer.from("MZ\x90\x00"))).toThrow(/non ammesso/);
    expect(() => sniff("script.exe", Buffer.from("%PDF-1.7"))).toThrow(/non ammesso/);
  });
  test("ZIP slip e path traversal rifiutati e auditati, file validi acquisiti, idempotenza per hash", async () => {
    const pid = ((await db.prepare("SELECT id FROM procedures WHERE code='P-003'").get()) as { id: number }).id;
    const z = zip([
      { name: "../../evil.pdf", data: Buffer.from("%PDF-1.4 evil") },
      { name: "ok/determina_indizione.pdf", data: realPdf("contratto.pdf") },
      { name: "nota.exe", data: Buffer.from("MZ") },
    ]);
    const r = await storeUpload(db, "admin", pid, "P-003", "fascicolo.zip", z);
    expect(r.stored.length).toBe(1);
    expect(r.rejected.join(" ")).toMatch(/ZIP slip/);
    expect(r.rejected.join(" ")).toMatch(/nota\.exe/);
    expect(((await db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='UPLOAD_REJECTED'").get()) as { n: number }).n).toBeGreaterThanOrEqual(1);
    const again = await storeUpload(db, "admin", pid, "P-003", "fascicolo.zip", z);
    expect(again.stored.length).toBe(0);
  });
});

describe("[US-022] estrazione dei campi", () => {
  test("netto, lordo, rate SAL e impegni da testo tipo determina", () => {
    const f = extractFields([
      {
        page: 1,
        method: "TEXT_LAYER",
        confidence: "1.00",
        text: "la spesa è pari ad € 98.200,00 oltre IVA (pari ad € 119.804,00). Il 20% dell'importo complessivo, pari ad € 19.640,00. Relativamente all'annualità 2026, impegno di importo pari ad € 95.843,20. Ai sensi del D.lgs. 36/2023 per appalti inferiori ad € 140.000,00. CIG B9767741AB",
      },
    ]);
    const m = Object.fromEntries(f.map((x) => [x.field, x.value]));
    expect(m).toMatchObject({ "amount.net": "98200.00", "amount.gross": "119804.00", "sal.installment.20%": "19640.00", "commitment.2026": "95843.20", cig: "B9767741AB" });
    expect(f.some((x) => x.value === "140000.00")).toBe(false);
  });
});

describe("[T-015] OCR di fallback su un atto reale senza layer di testo", () => {
  test("determina di indizione: testo riconosciuto con metodo e affidabilità", async () => {
    const [p] = await ocrPdfPages(path.join(root, "seed", "inapp", "documenti", "determina_indizione.pdf"), [1]);
    expect(p!.text).toMatch(/DETERMINA DEL DIRETTORE GENERALE/);
    expect(Number(p!.confidence)).toBeGreaterThan(0.7);
  }, 120000);

  test("documento caricato: pagine OCR salvate e proposte in coda, nessuna sovrascrittura", async () => {
    const pid = ((await db.prepare("SELECT id FROM procedures WHERE code='P-012'").get()) as { id: number }).id;
    const r = await storeUpload(db, "admin", pid, "P-012", "determina_indizione_scansione.pdf", realPdf("determina_indizione.pdf"));
    const out = await processDocument(db, r.stored[0]!, "admin");
    expect(out.state).toBe("OCR_DONE");
    expect(out.ocrPages).toBe(4);
    const pages = (await db.prepare("SELECT method FROM document_pages WHERE document_id = ?").all(r.stored[0]!)) as { method: string }[];
    expect(pages.every((p) => p.method === "OCR")).toBe(true);
    const gross = ((await db.prepare("SELECT gross_cents FROM contracts WHERE procedure_id = ?").get(pid)) as { gross_cents: number }).gross_cents;
    expect(gross).toBe(18000000); // BR-015: il validato non cambia
    expect(((await db.prepare("SELECT COUNT(*) n FROM validation_items WHERE document_id = ?").get(r.stored[0]!)) as { n: number }).n).toBeGreaterThan(0);
  }, 300000);
});

describe("[T-016] data impossibile", () => {
  test("data effettiva successiva alla data di riferimento → anomalia, nessuna correzione", () => {
    const base = scenarioAggregates().get("P-003")!;
    const agg = { ...base, milestones: base.milestones.map((m) => ({ ...m })) };
    agg.milestones[0]!.actualDate = isoDate("2026-12-01");
    const ev = evaluateProcedure(agg, REF, DEFAULT_SETTINGS);
    expect(ev.anomalies.map((a) => a.rule)).toContain("DATE_IMPOSSIBLE");
    expect(agg.milestones[0]!.actualDate).toBe("2026-12-01");
  });
});
