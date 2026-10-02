/* Genera una volta i PDF sintetici (DEC-070): dataset scenarios, oppure i casi dimostrativi con l'argomento "casi" (DEC-105). Metadati fissi, hash in SHA256SUMS. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const CASI = process.argv.includes("casi");
const OUT = path.resolve(__dirname, "..", "seed", ...(CASI ? ["inapp", "casi-demo"] : ["scenarios", "documents"]));
const FIXED = new Date("2026-09-01T00:00:00Z");

interface Doc {
  file: string;
  title: string;
  segnatura?: string;
  body: string[];
  raster?: boolean;
}

const det = (n: string, d: string) => `INAPP-DEMO.REGISTRO DETERMINE.${n}.DIREZIONE GENERALE.${d}.REGISTRAZIONE`;
const DOCS: Doc[] = [
  { file: "P-001/memoria_bozza.pdf", title: "MEMORIA PER IL DIRETTORE GENERALE (BOZZA)", body: ["Oggetto: Manutenzione evolutiva piattaforma OrientaLab - CUP CUP-DEMO-P001", "1. Quadro generale: evoluzione funzionale della piattaforma.", "5. Stima dei costi: importo complessivo pari ad € 98.360,66 oltre IVA (pari ad € 120.000,00 IVA inclusa).", "7. Fonti di finanziamento: annualità 2026 20%, annualità 2027 80%.", "BOZZA - non protocollata"] },
  { file: "P-002/scheda_fabbisogno.pdf", title: "SCHEDA FABBISOGNO", body: ["Oggetto: Supporto metodologico e project management", "Importo programmato pari ad € 480.000,00 IVA inclusa.", "Annualità 2026: € 200.000,00; annualità 2027: € 280.000,00."] },
  { file: "P-002/modulo_modifica.pdf", title: "MODULO DI MODIFICA DEL PIANO", body: ["Procedura P-002. Proposta di nuova data di inizio attività.", "Previsione 2026 € 200.000,00 → € 50.000,00; previsione 2027 € 280.000,00 → € 430.000,00 (da validare)."] },
  { file: "P-003/memoria.pdf", title: "MEMORIA PER IL DIRETTORE GENERALE", segnatura: "INAPP-DEMO.PROTOCOLLO.0000312.STUDI_ANALISI.10-09-2026", body: ["Oggetto: Indagine campionaria multicanale - CIG CIG-DEMO-P003", "Procedura aperta con criterio dell'offerta economicamente più vantaggiosa.", "Stima dei costi: € 590.163,93 oltre IVA (pari ad € 720.000,00 IVA inclusa)."] },
  { file: "P-003/capitolato_tecnico.pdf", title: "CAPITOLATO TECNICO", body: ["Oggetto: Indagine campionaria multicanale.", "Attività: disegno campionario, rilevazione CATI/CAWI, controllo qualità, rapporto finale.", "Durata: 18 mesi dalla stipula."] },
  { file: "P-004/determina_indizione.pdf", title: "DETERMINA DEL DIRETTORE GENERALE", segnatura: det("0000041", "28-01-2026"), body: ["Oggetto: indizione RdO per assistenza specialistica Data Warehouse - CIG CIG-DEMO-P004", "VISTA la memoria della Struttura Sistemi informativi;", "DETERMINA di impegnare relativamente all'annualità 2026 l'importo pari ad € 166.600,00 e relativamente all'annualità 2027 l'importo pari ad € 71.400,00."] },
  { file: "P-004/contratto.pdf", title: "CONTRATTO", body: ["Contratto per assistenza specialistica Data Warehouse - CIG CIG-DEMO-P004", "Operatore: Fornitore Demo Alfa S.r.l.", "Importo: € 195.081,97 oltre IVA (pari ad € 238.000,00 IVA inclusa).", "Decorrenza 20/05/2026, durata 12 mesi. Garanzia definitiva prestata."] },
  { file: "P-004/addendum_piano_sal.pdf", title: "ADDENDUM AL CONTRATTO - PIANO DELLE ATTIVITÀ E DEI PAGAMENTI", body: ["Art. 3 - Il pagamento sarà effettuato come segue:", "il 20% dell'importo complessivo, pari ad € 47.600,00 IVA inclusa;", "il 50% dell'importo complessivo, pari ad € 119.000,00 IVA inclusa;", "il 30% dell'importo complessivo, a saldo per l'importo di € 71.400,00 IVA inclusa."] },
  { file: "P-004/attestazione_regolare_esecuzione_sal1.pdf", title: "ATTESTAZIONE DI REGOLARE ESECUZIONE - SAL 1", body: ["Si attesta la regolare esecuzione delle attività del SAL 1 (20%)."] },
  { file: "P-004/relazione_sal2.pdf", title: "RELAZIONE SAL 2 - Fornitore Demo Alfa S.r.l.", body: ["Deliverable del secondo stato di avanzamento: modello dati e cruscotti.", "Presentato il 21/09/2026."] },
  { file: "P-005/determina_aggiudicazione.pdf", title: "DETERMINA DEL DIRETTORE GENERALE", segnatura: det("0000233", "15-06-2026"), body: ["Oggetto: aggiudicazione accordo quadro servizi cloud - CIG CIG-DEMO-P005", "PRESO ATTO della spesa complessiva di € 310.500,00 IVA inclusa;", "DETERMINA di aggiudicare; la stipula è subordinata alla presentazione della garanzia definitiva."] },
  { file: "P-006/documento_stipula_mepa.pdf", title: "DOCUMENTO DI STIPULA - TRATTATIVA DIRETTA MePA", body: ["CIG CIG-DEMO-P006 - Fornitore Demo Delta S.r.l.", "Valore complessivo € 32500 oltre IVA; IVA € 7150; totale € 39.650,00 IVA inclusa."] },
  { file: "P-006/certificato_regolare_esecuzione.pdf", title: "CERTIFICATO DI REGOLARE ESECUZIONE", body: ["Audit di accessibilità dei portali: prestazioni regolarmente eseguite."] },
  { file: "P-007/memoria_scansionata.pdf", title: "MEMORIA PER IL DIRETTORE GENERALE", segnatura: "INAPP-DEMO.PROTOCOLLO.0000377.FORMAZIONE.18-09-2026", body: ["Oggetto: Servizi logistici eventi e seminari - CIG CIG-DEMO-P007", "Stima dei costi: € 120.000,00 oltre IVA (pari ad € 146.400,00 IVA inclusa).", "Il documento tecnico sarà trasmesso successivamente."], raster: true },
  { file: "P-008/determina_indizione.pdf", title: "DETERMINA DEL DIRETTORE GENERALE", segnatura: det("0000402", "20-11-2025"), body: ["Oggetto: indizione procedura aperta - piattaforma politiche attive - CIG CIG-DEMO-P008", "Prenotazioni: annualità 2026 € 350.000,00; annualità 2027 € 400.000,00; annualità 2028 € 140.000,00."] },
  { file: "P-008/bando.pdf", title: "BANDO DI GARA - ESTRATTO", body: ["Procedura aperta in ambito europeo, criterio dell'offerta economicamente più vantaggiosa.", "Termine per la ricezione delle offerte: 15/01/2026."] },
  { file: "P-009/ordinativo_convenzione.pdf", title: "ORDINATIVO DI FORNITURA SU CONVENZIONE", body: ["CIG CIG-DEMO-P009 - Fornitore Demo Epsilon S.p.A.", "Imponibile € 250.000,00; IVA € 55.000,00; totale € 305.000,00 IVA inclusa."] },
  { file: "P-010/contratto.pdf", title: "CONTRATTO", body: ["Assessment sicurezza e penetration test - CIG CIG-DEMO-P010", "Stipulato in data 10/06/2026 con Fornitore Demo Beta S.r.l.", "Importo € 172.131,15 oltre IVA (pari ad € 210.000,00 IVA inclusa)."] },
  { file: "P-010/determina_aggiudicazione.pdf", title: "DETERMINA DEL DIRETTORE GENERALE", segnatura: det("0000251", "20-06-2026"), body: ["Oggetto: aggiudicazione assessment sicurezza - CIG CIG-DEMO-P010", "La determina è registrata dopo la data indicata nel contratto (incoerenza voluta del dataset)."] },
  { file: "P-011/determina_revoca.pdf", title: "DETERMINA DI REVOCA", segnatura: det("0000330", "10-09-2026"), body: ["Revoca della procedura P-011 e rilascio della prenotazione di € 75.000,00."] },
  { file: "P-012/determina_aggiudicazione.pdf", title: "DETERMINA DEL DIRETTORE GENERALE", segnatura: det("0000362", "24-09-2026"), body: ["Oggetto: aggiudicazione formazione avanzata su dati e IA - CIG CIG-DEMO-P012", "Importo € 147.540,98 oltre IVA (pari ad € 180.000,00 IVA inclusa)."] },
  { file: "da_associare/determina_indizione_cig_demo_p012.pdf", title: "DETERMINA DEL DIRETTORE GENERALE", segnatura: det("0000098", "20-03-2026"), body: ["Oggetto: indizione procedura negoziata - CIG CIG-DEMO-P012", "Documento senza codice procedura nel nome: associazione per CIG."], raster: true },
];

/** Documenti dei casi dimostrativi (DEC-105/107): uno per ogni atto citato in seed/inapp/casi-demo.json. */
function casiDocs(): Doc[] {
  const ds = JSON.parse(readFileSync(path.resolve(__dirname, "..", "seed", "inapp", "casi-demo.json"), "utf8")) as {
    procedures: { code: string; title: string; programmed: string; operator?: string; documents: { type: string; file: string; title?: string }[] }[];
  };
  const eur = (v: string) => `€ ${Number(v.split(".")[0]).toLocaleString("it-IT")},${v.split(".")[1] ?? "00"}`;
  const ops: Record<string, string> = { "SUP-ALFA": "Fornitore Demo Alfa S.r.l.", "SUP-BETA": "Fornitore Demo Beta S.r.l.", "SUP-EPSILON": "Fornitore Demo Epsilon S.p.A." };
  const out: Doc[] = [];
  for (const p of ds.procedures) {
    const cig = `CIG-DEMO-${p.code.replace("-", "")}`;
    const op = p.operator ? (ops[p.operator] ?? p.operator) : "operatore da individuare";
    for (const d of p.documents) {
      const file = d.file.replace(/^casi:/, "");
      const head = `Oggetto: ${p.title} - ${cig}`;
      const body: Record<string, string[]> = {
        MEMORIA: [head, "1. Fabbisogno e obiettivi dell'intervento.", `5. Stima dei costi: ${eur(p.programmed)} IVA inclusa.`, "7. Fonte di finanziamento: PN Giovani, Donne e Lavoro (demo)."],
        DOCUMENTO_TECNICO: [head, "Attività, deliverable, durata e requisiti tecnici del servizio.", "Criteri di verifica della regolare esecuzione."],
        DOCUMENTI_OPERATORE: [head, `Operatore: ${op}.`, "DGUE, dichiarazioni sui requisiti generali e speciali, visura camerale, DURC."],
        DETERMINA_INDIZIONE: [head, "DETERMINA di indire la procedura, di acquisire il CIG e di nominare il RUP.", `Impegno di spesa complessivo pari ad ${eur(p.programmed)} IVA inclusa, ripartito per annualità.`],
        DETERMINA_AGGIUDICAZIONE: [head, `DETERMINA di aggiudicare a ${op} per l'importo di ${eur(p.programmed)} IVA inclusa.`],
        GARANZIA_DEFINITIVA: [head, `Garanzia definitiva prestata da ${op} ai sensi della normativa vigente.`],
        ODA: [head, `Ordine diretto di acquisto MePA intestato a ${op}.`, `Totale ordine ${eur(p.programmed)} IVA inclusa. In attesa di accettazione del fornitore.`],
      };
      out.push({ file, title: (d.title ?? d.type).replace(/ – .*$/, "").toUpperCase(), body: body[d.type] ?? [head, d.title ?? d.type, d.type === "MEMORIA" ? "BOZZA" : ""] });
    }
  }
  // Bozza BZ-001 (procedura guida della demo): memoria e documento tecnico pronti da consegnare
  const bz = "Oggetto: Rinnovo licenze e supporto della piattaforma di business intelligence";
  out.push({ file: "BZ-001/memoria.pdf", title: "MEMORIA PER IL DIRETTORE GENERALE", body: [bz, "5. Stima dei costi: € 70.000,00 oltre IVA (pari ad € 85.400,00 IVA inclusa).", "Annualità 2026 € 25.620,00; annualità 2027 € 59.780,00."] });
  out.push({ file: "BZ-001/documento_tecnico.pdf", title: "DOCUMENTO TECNICO", body: [bz, "Licenze per 12 mesi, supporto specialistico e aggiornamenti della piattaforma di business intelligence."] });
  return out;
}

const clean = (s: string) => s.replace(/€/g, "EUR").replace(/[’]/g, "'").replace(/→/g, "->").replace(/[^\x20-\x7E -ÿ]/g, "?");

async function textPdf(d: Doc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (const m of ["setCreationDate", "setModificationDate"] as const) pdf[m](FIXED);
  pdf.setProducer("INAPP DEMO generator");
  pdf.setTitle(d.title);
  const page = pdf.addPage([595, 842]);
  const f = await pdf.embedFont(StandardFonts.Helvetica);
  const b = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  if (d.segnatura) page.drawText(clean(d.segnatura), { x: 40, y: 815, size: 7, font: f });
  page.drawText("INAPP DEMO - Istituto nazionale per l'analisi delle politiche pubbliche", { x: 40, y, size: 9, font: b, color: rgb(0, 0.21, 0.4) });
  y -= 40;
  page.drawText(clean(d.title), { x: 40, y, size: 13, font: b });
  y -= 30;
  for (const line of d.body) {
    for (const chunk of clean(line).match(/.{1,95}(\s|$)/g) ?? []) {
      page.drawText(chunk.trim(), { x: 40, y, size: 10, font: f });
      y -= 15;
    }
    y -= 6;
  }
  page.drawText("DEMO - documento sintetico", { x: 40, y: 30, size: 8, font: f, color: rgb(0.4, 0.4, 0.4) });
  return pdf.save({ useObjectStreams: false });
}

async function rasterPdf(d: Doc): Promise<Uint8Array> {
  const { createCanvas } = await import("@napi-rs/canvas");
  const W = 1240;
  const H = 1754;
  const c = createCanvas(W, H);
  const g = c.getContext("2d");
  g.fillStyle = "#fbfaf6";
  g.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = "rgba(0,0,0,0.05)";
  for (let i = 0; i < 1500; i++) g.fillRect(rnd() * W, rnd() * H, 2, 2);
  g.fillStyle = "#1a1a1a";
  let y = 120;
  if (d.segnatura) {
    g.font = "18px sans-serif";
    g.fillText(d.segnatura, 80, 70);
  }
  g.font = "bold 26px sans-serif";
  g.fillText("INAPP DEMO", 80, y);
  y += 80;
  g.font = "bold 32px sans-serif";
  g.fillText(d.title, 80, y);
  y += 70;
  g.font = "26px sans-serif";
  for (const line of d.body) {
    for (const chunk of line.match(/.{1,70}(\s|$)/g) ?? []) {
      g.fillText(chunk.trim(), 80, y);
      y += 40;
    }
    y += 14;
  }
  const png = c.toBuffer("image/png");
  const pdf = await PDFDocument.create();
  for (const m of ["setCreationDate", "setModificationDate"] as const) pdf[m](FIXED);
  pdf.setProducer("INAPP DEMO generator (scansione simulata)");
  const img = await pdf.embedPng(png);
  const page = pdf.addPage([595, 842]);
  page.drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
  return pdf.save({ useObjectStreams: false });
}

async function main() {
  if (CASI) rmSync(OUT, { recursive: true, force: true });
  const sums: string[] = [];
  for (const d of CASI ? casiDocs() : DOCS) {
    const bytes = d.raster ? await rasterPdf(d) : await textPdf(d);
    const file = path.join(OUT, d.file);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    sums.push(`${createHash("sha256").update(bytes).digest("hex")}  ${d.file}`);
  }
  writeFileSync(path.join(OUT, "SHA256SUMS"), sums.join("\n") + "\n");
  const count = readdirSync(OUT, { recursive: true }).filter((f) => String(f).endsWith(".pdf") && statSync(path.join(OUT, String(f))).isFile()).length;
  console.log(`Generati ${count} documenti in ${OUT}`);
}

void main();
