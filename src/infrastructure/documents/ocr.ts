import { readFileSync } from "node:fs";
import path from "node:path";
import { projectRoot } from "../config/templates";

export interface OcrPage {
  page: number;
  text: string;
  confidence: string;
}

/**
 * OCR locale (DEC-099): rendering della pagina con pdf.js + @napi-rs/canvas e riconoscimento
 * con tesseract.js e dati `ita` versionati in vendor/tessdata (nessuna CDN). Errore recuperabile.
 */
export async function ocrPdfPages(file: string, pages: number[], scale = 2.5): Promise<OcrPage[]> {
  if (process.env.OCR_ENABLED === "false") throw new Error("OCR disattivato (OCR_ENABLED=false)");
  const { renderPageAsImage, getDocumentProxy } = await import("unpdf");
  const { createWorker } = await import("tesseract.js");
  const data = new Uint8Array(readFileSync(file));
  const pdf = await getDocumentProxy(data);
  const worker = await createWorker("ita", 1, {
    langPath: path.join(projectRoot(), "vendor", "tessdata"),
    cachePath: path.join(projectRoot(), ".data", "tesscache"),
    gzip: true,
  });
  const out: OcrPage[] = [];
  try {
    for (const n of pages) {
      const img = await renderPageAsImage(pdf, n, { canvasImport: () => import("@napi-rs/canvas"), scale });
      const r = await worker.recognize(Buffer.from(img));
      out.push({ page: n, text: r.data.text.trim(), confidence: (r.data.confidence / 100).toFixed(2) });
    }
  } finally {
    await worker.terminate();
  }
  return out;
}
