import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Money } from "@/domain/money";
import { writeAudit } from "@/infrastructure/audit";
import { systemNowIso } from "@/infrastructure/clock";
import { projectRoot } from "@/infrastructure/config/templates";
import { tx, type Db } from "@/infrastructure/db/connection";
import { ocrPdfPages } from "@/infrastructure/documents/ocr";
import { extractPdfText, findCigs } from "@/infrastructure/documents/pdf-text";
import { DomainError } from "./errors";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ZIP_MAX_ENTRIES = 200;
const ZIP_MAX_TOTAL = 100 * 1024 * 1024;

export function storageRoot(): string {
  return process.env.STORAGE_PATH ?? path.join(path.dirname(process.env.DATABASE_PATH ?? path.join(projectRoot(), ".data", "x")), "storage");
}

/** Percorso fisico di un documento (mai esposto al client, US-081). */
export function documentFile(filePath: string): string {
  const root = projectRoot();
  if (filePath.startsWith("inapp:")) return path.join(root, "seed", "inapp", "documenti", path.basename(filePath.slice(6)));
  if (filePath.startsWith("casi:")) return path.join(root, "seed", "inapp", "casi-demo", ...filePath.slice(5).split("/").filter((x) => x && x !== ".."));
  if (filePath.startsWith("storage:")) {
    const sha = filePath.slice(8).replace(/[^a-f0-9]/g, "");
    return path.join(storageRoot(), sha.slice(0, 2), sha);
  }
  return path.join(root, "seed", "scenarios", "documents", ...filePath.split("/").filter((x) => x && x !== ".."));
}

export function normalizeFileName(name: string): string {
  const base = path.basename(name.replace(/\\/g, "/"));
  return base.normalize("NFKD").replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "documento";
}

/** Allowlist per estensione e firma del contenuto (US-112, 11.1). */
export function sniff(name: string, buf: Buffer): "PDF" | "XLSX" | "ZIP" {
  const ext = path.extname(name).toLowerCase();
  const isPdf = buf.subarray(0, 5).toString("latin1") === "%PDF-";
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  if (ext === ".pdf" && isPdf) return "PDF";
  if (ext === ".xlsx" && isZip) return "XLSX";
  if (ext === ".zip" && isZip) return "ZIP";
  throw new DomainError("UPLOAD_REJECTED", `File non ammesso o contenuto non coerente con l'estensione: ${normalizeFileName(name)}`, 422);
}

const TYPE_BY_NAME: [RegExp, string][] = [
  [/memoria/i, "MEMORIA"],
  [/tecnic|capitolat/i, "DOCUMENTO_TECNICO"],
  [/indizione|contrarre/i, "DETERMINA_INDIZIONE"],
  [/aggiudicaz/i, "DETERMINA_AGGIUDICAZIONE"],
  [/garanzi|fideiuss|cauzion/i, "GARANZIA_DEFINITIVA"],
  [/addendum/i, "ADDENDUM"],
  [/revoca/i, "DETERMINA_REVOCA"],
  [/contratt|ordine|stipula|oda/i, "CONTRATTO"],
  [/sal|verbale/i, "VERBALE_SAL"],
];
export const classifyByName = (name: string) => TYPE_BY_NAME.find(([re]) => re.test(name))?.[1] ?? null;

function rejectAudit(db: Db, actor: string, code: string, name: string, reason: string) {
  tx(db, () => writeAudit(db, { actor, action: "UPLOAD_REJECTED", entityType: "DOCUMENT", entityId: normalizeFileName(name), procedureCode: code, reason, at: systemNowIso() }));
}

/** Upload di un PDF/XLSX o di uno ZIP (estratto con limiti anti ZIP slip/bomb). Idempotente per hash (BR-016). */
export async function storeUpload(db: Db, actor: string, procedureId: number, code: string, name: string, buf: Buffer): Promise<{ stored: number[]; rejected: string[] }> {
  if (buf.length > MAX_UPLOAD_BYTES) {
    rejectAudit(db, actor, code, name, "dimensione oltre il limite");
    throw new DomainError("UPLOAD_REJECTED", "File oltre il limite di 20 MB", 413);
  }
  let kind: ReturnType<typeof sniff>;
  try {
    kind = sniff(name, buf);
  } catch (e) {
    rejectAudit(db, actor, code, name, "tipo non ammesso");
    throw e;
  }
  const files: { name: string; buf: Buffer }[] = [];
  const rejected: string[] = [];
  if (kind === "ZIP") {
    const entries = await readZip(buf);
    for (const e of entries) {
      if (e.rejected) {
        rejected.push(`${e.name}: ${e.rejected}`);
        rejectAudit(db, actor, code, e.name, e.rejected);
        continue;
      }
      try {
        sniff(e.name, e.buf!);
        files.push({ name: e.name, buf: e.buf! });
      } catch {
        rejected.push(`${e.name}: tipo non ammesso`);
      }
    }
  } else files.push({ name, buf });

  const stored: number[] = [];
  for (const f of files) {
    const sha = createHash("sha256").update(f.buf).digest("hex");
    const dir = path.join(storageRoot(), sha.slice(0, 2));
    mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, sha);
    if (!existsSync(dest)) writeFileSync(dest, f.buf);
    const clean = normalizeFileName(f.name);
    const id = tx(db, () => {
      const r = db
        .prepare(
          `INSERT OR IGNORE INTO documents (procedure_id, file_path, file_name, sha256, size_bytes, doc_type, title, processing_state, association_method, association_confidence, uploaded_by, uploaded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'STORED', 'UPLOAD', '1.00', ?, ?)`,
        )
        .run(procedureId, `storage:${sha}`, clean, sha, f.buf.length, classifyByName(clean), clean.replace(/\.[a-z]+$/i, ""), actor, systemNowIso());
      if (r.changes) {
        writeAudit(db, { actor, action: "DOCUMENT_UPLOAD", entityType: "DOCUMENT", entityId: clean, procedureCode: code, after: { sha256: sha, bytes: f.buf.length }, at: systemNowIso() });
        return Number(r.lastInsertRowid);
      }
      return null;
    });
    if (id) stored.push(id);
  }
  return { stored, rejected };
}

async function readZip(buf: Buffer): Promise<{ name: string; buf?: Buffer; rejected?: string }[]> {
  const yauzl = await import("yauzl");
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buf, { lazyEntries: true, validateEntrySizes: true, decodeStrings: false }, (err, zip) => {
      if (err || !zip) return reject(new DomainError("UPLOAD_REJECTED", "Archivio ZIP non valido", 422));
      const out: { name: string; buf?: Buffer; rejected?: string }[] = [];
      let total = 0;
      let count = 0;
      zip.on("entry", (entry) => {
        const name: string = Buffer.isBuffer(entry.fileName) ? (entry.fileName as Buffer).toString("utf8") : String(entry.fileName);
        count++;
        if (count > ZIP_MAX_ENTRIES) {
          zip.close();
          return reject(new DomainError("UPLOAD_REJECTED", "Archivio con troppi file", 422));
        }
        if (/\/$/.test(name)) return zip.readEntry();
        if (name.includes("..") || name.startsWith("/") || /^[a-z]:/i.test(name) || name.includes("\\")) {
          out.push({ name, rejected: "percorso non ammesso (ZIP slip)" });
          return zip.readEntry();
        }
        total += entry.uncompressedSize;
        if (total > ZIP_MAX_TOTAL || entry.uncompressedSize > MAX_UPLOAD_BYTES || (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > 200)) {
          zip.close();
          return reject(new DomainError("UPLOAD_REJECTED", "Archivio sospetto (dimensione o rapporto di compressione oltre i limiti)", 422));
        }
        zip.openReadStream(entry, (e2, stream) => {
          if (e2 || !stream) {
            out.push({ name, rejected: "lettura non riuscita" });
            return zip.readEntry();
          }
          const chunks: Buffer[] = [];
          stream.on("data", (c: Buffer) => chunks.push(c));
          stream.on("end", () => {
            out.push({ name, buf: Buffer.concat(chunks) });
            zip.readEntry();
          });
        });
      });
      zip.on("end", () => resolve(out));
      zip.on("error", () => reject(new DomainError("UPLOAD_REJECTED", "Archivio ZIP non valido", 422)));
      zip.readEntry();
    });
  });
}

const MONEY_RE = /(?:€|euro|eur)\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?|[0-9]+(?:,[0-9]{2})?)/gi;
function parseItMoney(s: string): Money | null {
  const clean = s.replace(/\./g, "").replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(clean) ? Money.parse(clean) : null;
}

export interface ExtractedField {
  field: string;
  value: string;
  page: number;
  excerpt: string;
  method: string;
  confidence: string;
}

/** Estrazione deterministica dei campi principali (US-022): CIG, importi lordo/netto, date di registrazione. */
export function extractFields(pages: { page: number; text: string; method: string; confidence: string | null }[]): ExtractedField[] {
  const out: ExtractedField[] = [];
  const seen = new Set<string>();
  const push = (f: ExtractedField) => {
    const k = `${f.field}=${f.value}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(f);
    }
  };
  for (const p of pages) {
    const t = p.text;
    const conf = p.method === "OCR" ? (p.confidence ?? "0.50") : "0.95";
    for (const cig of findCigs(t)) {
      const i = t.toUpperCase().indexOf(cig);
      const ctx = t.slice(Math.max(0, i - 20), i).toLowerCase();
      if (/cig|c\.i\.g/.test(ctx) || /CIG/.test(t.slice(Math.max(0, i - 30), i))) push({ field: "cig", value: cig, page: p.page, excerpt: t.slice(Math.max(0, i - 30), i + 14).replace(/\s+/g, " "), method: p.method, confidence: conf });
    }
    for (const m of t.matchAll(MONEY_RE)) {
      const v = parseItMoney(m[1]!);
      if (!v || v.lt(Money.parse("1000"))) continue;
      const at = m.index ?? 0;
      const before = t.slice(Math.max(0, at - 90), at).replace(/\s+/g, " ").toLowerCase();
      const after = t.slice(at + m[0].length, at + m[0].length + 40).replace(/\s+/g, " ").toLowerCase();
      const ctx = t.slice(Math.max(0, at - 80), at + m[0].length + 40).replace(/\s+/g, " ").trim();
      // riferimenti normativi e soglie citate nel testo: non sono dati della procedura
      if (/d\.\s?lgs|soglia|inferiore|superiore|obbligo|mercato elettronico|art\.\s?\d/.test(before.slice(-70))) continue;
      const pct = /(\d{1,3})\s*%[^%]*$/.exec(before.slice(-70));
      const year = /(?:annualit[aà]|previsione|esercizio)\s*(\d{4})(?!.*(?:annualit|previsione|esercizio))/.exec(before.slice(-90));
      let field: string | null = null;
      if (pct) field = `sal.installment.${pct[1]}%`;
      else if (year) field = `commitment.${year[1]}`;
      else if (/^[^a-z]{0,6}(oltre iva|iva esclusa|\+ ?iva|al netto)/.test(after)) field = "amount.net";
      else if (/^[^a-z]{0,6}(iva inclusa|iva compresa|comprensiv)/.test(after)) field = "amount.gross";
      else if (/(oltre iva|iva esclusa)\s*\(?\s*pari ad?\s*$/.test(before.slice(-40)) || /lordo|iva inclusa/.test(before.slice(-40))) field = "amount.gross";
      else if (/netto|imponibile|iva esclusa/.test(before.slice(-40))) field = "amount.net";
      if (field) push({ field, value: v.toString(), page: p.page, excerpt: ctx, method: p.method, confidence: conf });
    }
    const reg = /REGISTRO DETERMINE\.\d+\.[A-Z ]+\.(\d{2})-(\d{2})-(\d{4})/.exec(t);
    if (reg) push({ field: "act.registration_date", value: `${reg[3]}-${reg[2]}-${reg[1]}`, page: p.page, excerpt: reg[0], method: p.method, confidence: conf });
  }
  return out;
}

/** Elaborazione del documento: testo → OCR di fallback → estrazione → coda di validazione (nessun overwrite, BR-015). */
export async function processDocument(db: Db, docId: number, actor = "worker"): Promise<{ pages: number; ocrPages: number; fields: number; state: string }> {
  const doc = db.prepare("SELECT d.*, p.code, p.cig AS proc_cig FROM documents d JOIN procedures p ON p.id = d.procedure_id WHERE d.id = ?").get(docId) as Record<string, any> | undefined;
  if (!doc) throw new DomainError("NOT_FOUND", "Documento non trovato", 404);
  const file = documentFile(doc.file_path);
  if (!existsSync(file) || !String(doc.file_name).toLowerCase().endsWith(".pdf")) return { pages: 0, ocrPages: 0, fields: 0, state: doc.processing_state };
  const { pages, totalPages } = await extractPdfText(file);
  const missing = pages.filter((p) => p.method === "NONE").map((p) => p.page);
  let ocr: Awaited<ReturnType<typeof ocrPdfPages>> = [];
  let state = missing.length ? "OCR_PENDING" : "TEXT_EXTRACTED";
  if (missing.length) {
    try {
      ocr = await ocrPdfPages(file, missing);
      state = "OCR_DONE";
    } catch (e) {
      state = "OCR_FAILED";
      console.warn(`[OCR] ${doc.file_name}: ${e instanceof Error ? e.message : e}`);
    }
  }
  const all = pages.map((p) => {
    const o = ocr.find((x) => x.page === p.page);
    return o ? { page: p.page, text: o.text, method: "OCR", confidence: o.confidence } : { page: p.page, text: p.text, method: p.method, confidence: p.method === "TEXT_LAYER" ? "1.00" : null };
  });
  const fields = extractFields(all.filter((p) => p.text));
  const contract = db.prepare("SELECT gross_cents, net_cents FROM contracts WHERE procedure_id = ?").get(doc.procedure_id) as { gross_cents: number; net_cents: number } | undefined;
  const now = systemNowIso();
  tx(db, () => {
    for (const p of all) db.prepare("INSERT OR REPLACE INTO document_pages (document_id, page_no, text, method, confidence) VALUES (?, ?, ?, ?, ?)").run(docId, p.page, p.text, p.method, p.confidence);
    db.prepare("UPDATE documents SET pages = ?, processing_state = ? WHERE id = ?").run(totalPages, state, docId);
    for (const f of fields) {
      const commitYear = /^commitment\.(\d{4})$/.exec(f.field)?.[1];
      const committed = commitYear
        ? (db.prepare("SELECT SUM(amount_cents) AS s FROM financial_movements WHERE procedure_id = ? AND type = 'COMMITMENT' AND year = ?").get(doc.procedure_id, Number(commitYear)) as { s: number | null }).s
        : null;
      const current =
        f.field === "cig"
          ? doc.proc_cig || null
          : f.field === "amount.gross" && contract
            ? Money.ofCents(BigInt(contract.gross_cents)).toString()
            : f.field === "amount.net" && contract
              ? Money.ofCents(BigInt(contract.net_cents)).toString()
              : committed !== null
                ? Money.ofCents(BigInt(committed)).toString()
                : null;
      const kind = current !== null && current !== f.value ? "CONFLICT" : "EXTRACTED_FIELD";
      const status = current !== null && current === f.value ? "APPROVED" : "OPEN";
      db.prepare(
        `INSERT OR IGNORE INTO validation_items (procedure_id, kind, field, proposed_value, current_value, document_id, locator, excerpt, method, confidence, status, decided_by, decided_at, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(doc.procedure_id, kind, f.field, f.value, current, docId, `pag. ${f.page}`, f.excerpt.slice(0, 300), f.method, f.confidence, status, status === "APPROVED" ? "system" : null, status === "APPROVED" ? now : null, status === "APPROVED" ? "Coincide con il valore validato" : null, now);
      db.prepare(
        "INSERT INTO evidences (procedure_id, field, value, source_type, document_id, locator, excerpt, method, confidence, author, created_at) VALUES (?, ?, ?, 'DOCUMENT', ?, ?, ?, ?, ?, ?, ?)",
      ).run(doc.procedure_id, `extracted.${f.field}`, f.value, docId, `pag. ${f.page}`, f.excerpt.slice(0, 300), f.method, f.confidence, actor, now);
    }
    writeAudit(db, { actor, action: "DOCUMENT_PROCESSED", entityType: "DOCUMENT", entityId: String(docId), procedureCode: doc.code, after: { state, pages: totalPages, ocrPages: ocr.length, fields: fields.length }, at: now });
  });
  return { pages: totalPages, ocrPages: ocr.length, fields: fields.length, state };
}

export async function processPendingDocuments(db: Db, actor = "worker"): Promise<{ processed: number }> {
  const ids = (db.prepare("SELECT id FROM documents WHERE processing_state IN ('STORED','OCR_PENDING') ORDER BY id").all() as { id: number }[]).map((r) => r.id);
  for (const id of ids) await processDocument(db, id, actor);
  return { processed: ids.length };
}

export function readStoredFile(filePath: string): Buffer {
  return readFileSync(documentFile(filePath));
}
