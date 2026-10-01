import { readFileSync } from "node:fs";

export interface PageText {
  page: number;
  text: string;
  method: "TEXT_LAYER" | "NONE";
}

/** Estrazione del layer di testo (DEC-099). Le pagine senza testo restano da OCR. */
export async function extractPdfText(file: string): Promise<{ pages: PageText[]; totalPages: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const data = new Uint8Array(readFileSync(file));
  const pdf = await getDocumentProxy(data);
  const { text, totalPages } = await extractText(pdf, { mergePages: false });
  const arr = Array.isArray(text) ? text : [text];
  return {
    totalPages,
    pages: arr.map((t, i) => {
      const clean = String(t ?? "").replace(/\s+\n/g, "\n").trim();
      return { page: i + 1, text: clean, method: clean.replace(/\s/g, "").length >= 30 ? "TEXT_LAYER" : "NONE" };
    }),
  };
}

export const CIG_RE = /\b([A-Z0-9]{10})\b/g;

/** CIG reali: 10 caratteri alfanumerici con almeno una lettera e una cifra. */
export function findCigs(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.toUpperCase().matchAll(CIG_RE)) {
    const c = m[1]!;
    if (/[A-Z]/.test(c) && /\d/.test(c)) out.add(c);
  }
  return [...out];
}
