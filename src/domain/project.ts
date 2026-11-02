/**
 * Progetto di una gara (DEC-111, incremento 4): nel workbook è l'«Operazione / Attività»
 * (es. «Operazione 1 – Attività 5» → codice OP01-A5). Funzione pura, nessun I/O.
 * La stessa regola è applicata in SQL dalla migrazione 0006_projects.sql.
 */
export interface ProjectRef {
  code: string;
  name: string;
}

const OPERATION_RE = /Operazione\s+(\d+)\s*[–-]\s*Attivit\S*\s+(.+)$/i;

export function projectFromOperation(operation: string | null | undefined): ProjectRef | null {
  if (!operation) return null;
  const m = OPERATION_RE.exec(operation.trim());
  if (!m) return null;
  return { code: `OP${m[1]!.padStart(2, "0")}-A${m[2]!.replace(/\s/g, "")}`, name: operation.trim() };
}
