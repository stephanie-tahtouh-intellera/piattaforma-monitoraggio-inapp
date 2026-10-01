import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { SeedDataset } from "@/contracts/seed";
import { BusinessCalendar } from "@/domain/dates";
import { writeAudit } from "@/infrastructure/audit";
import type { Clock } from "@/infrastructure/clock";
import { loadTemplates, projectRoot } from "@/infrastructure/config/templates";
import { tx, type Db } from "@/infrastructure/db/connection";
import { extractPdfText, findCigs } from "@/infrastructure/documents/pdf-text";
import { readInappWorkbook } from "@/infrastructure/import/inapp-workbook";

export function inappWorkbookPath(): string {
  return path.join(projectRoot(), "seed", "inapp", "workbook_PN_GDL.xlsx");
}

/** Import del portafoglio reale (DEC-071) con report per foglio e per riga (US-010). */
export async function importInappWorkbook(db: Db, clock: Clock): Promise<SeedDataset> {
  const file = inappWorkbookPath();
  const { procedures, report } = await readInappWorkbook(file, loadTemplates(), new BusinessCalendar(), clock.referenceDate());
  tx(db, () => {
    db.prepare("INSERT INTO import_reports (dataset, source_file, summary_json, created_by, created_at) VALUES ('inapp', ?, ?, 'seed', ?)").run(
      path.basename(file),
      JSON.stringify(report),
      clock.nowIso(),
    );
  });
  return { dataset: "inapp", description: "Portafoglio reale INAPP – PN Giovani, Donne e Lavoro (foglio Gare_23-27)", procedures };
}

const TYPE_BY_NAME: [RegExp, string, string | null][] = [
  [/memoria/i, "MEMORIA", null],
  [/documento.?tecnico|capitolato/i, "DOCUMENTO_TECNICO", "SCHEDA_OFFERTA"],
  [/indizione/i, "DETERMINA_INDIZIONE", null],
  [/aggiudicazione/i, "DETERMINA_AGGIUDICAZIONE", null],
  [/addendum/i, "ADDENDUM", null],
  [/contratto|ordine|stipula/i, "CONTRATTO", "ODA_MEPA"],
];

/**
 * Fascicolo reale (seed/inapp/documenti): associazione per CIG trovato nel testo
 * (US-021, affidabilità alta) e per appartenenza allo stesso fascicolo (affidabilità
 * media → coda di validazione). Il testo delle pagine è salvato per l'assistente e il viewer.
 */
export async function attachRealDocuments(db: Db, clock: Clock): Promise<{ attached: number; procedure: string | null }> {
  const dir = path.join(projectRoot(), "seed", "inapp", "documenti");
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
  const texts = new Map<string, Awaited<ReturnType<typeof extractPdfText>>>();
  for (const f of files) {
    try {
      texts.set(f, await extractPdfText(path.join(dir, f)));
    } catch {
      texts.set(f, { pages: [], totalPages: 0 });
    }
  }
  // Procedura del fascicolo: primo CIG presente nei testi che corrisponde a una procedura
  let target: { id: number; code: string; cig: string } | null = null;
  let cigSource: string | null = null;
  for (const [f, t] of texts) {
    for (const cig of findCigs(t.pages.map((p) => p.text).join("\n"))) {
      const row = db.prepare("SELECT id, code, cig FROM procedures WHERE upper(cig) = ?").get(cig) as { id: number; code: string; cig: string } | undefined;
      if (row) {
        target = row;
        cigSource = f;
        break;
      }
    }
    if (target) break;
  }
  if (!target) return { attached: 0, procedure: null };
  const now = clock.nowIso();
  let attached = 0;
  tx(db, () => {
    for (const f of files) {
      const full = path.join(dir, f);
      const buf = readFileSync(full);
      const sha = createHash("sha256").update(buf).digest("hex");
      const kind = TYPE_BY_NAME.find(([re]) => re.test(f));
      const t = texts.get(f)!;
      const byCig = f === cigSource || findCigs(t.pages.map((p) => p.text).join("\n")).includes(target!.cig.toUpperCase());
      const method = byCig ? "CIG" : "FASCICOLO";
      const conf = byCig ? "0.98" : "0.80";
      const info = db
        .prepare(
          `INSERT OR IGNORE INTO documents (procedure_id, file_path, file_name, sha256, size_bytes, doc_type, subtype, title, pages, processing_state, association_method, association_confidence, uploaded_by, uploaded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', ?)`,
        )
        .run(
          target!.id,
          `inapp:${f}`,
          f,
          sha,
          statSync(full).size,
          kind?.[1] ?? null,
          kind?.[2] ?? null,
          f.replace(/\.pdf$/i, ""),
          t.totalPages,
          t.pages.some((p) => p.method === "NONE") ? "OCR_PENDING" : "TEXT_EXTRACTED",
          method,
          conf,
          now,
        );
      if (!info.changes) continue;
      const docId = Number(info.lastInsertRowid);
      for (const p of t.pages) db.prepare("INSERT OR REPLACE INTO document_pages (document_id, page_no, text, method, confidence) VALUES (?, ?, ?, ?, ?)").run(docId, p.page, p.text, p.method, p.method === "TEXT_LAYER" ? "1.00" : null);
      db.prepare(
        "INSERT INTO evidences (procedure_id, field, value, source_type, document_id, locator, excerpt, method, confidence, author, created_at) VALUES (?, 'document.association', ?, 'DOCUMENT', ?, ?, ?, ?, ?, 'system', ?)",
      ).run(target!.id, target!.code, docId, byCig ? "CIG nel testo" : "stesso fascicolo", byCig ? `CIG ${target!.cig}` : `Fascicolo "Documenti Gara"`, method, conf, now);
      if (!byCig) {
        db.prepare(
          `INSERT OR IGNORE INTO validation_items (procedure_id, kind, field, proposed_value, document_id, locator, excerpt, method, confidence, created_at)
           VALUES (?, 'ASSOCIATION', 'document.procedure', ?, ?, ?, ?, 'FASCICOLO', ?, ?)`,
        ).run(target!.id, target!.code, docId, f, "Associazione proposta per appartenenza al fascicolo (sotto soglia di affidabilità)", conf, now);
      }
      attached++;
    }
    db.prepare("UPDATE procedures SET documents_tracked = 1 WHERE id = ?").run(target!.id);
    writeAudit(db, { actor: "system", action: "IMPORT_DOCUMENTS", entityType: "PROCEDURE", entityId: target!.code, procedureCode: target!.code, after: { files: files.length, attached }, at: now });
  });
  return { attached, procedure: target.code };
}
