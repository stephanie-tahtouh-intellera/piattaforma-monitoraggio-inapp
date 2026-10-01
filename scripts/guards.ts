/* Guard del quality gate (guida §12.4): fallisce se trova violazioni delle regole non negoziabili. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });

const problems: string[] = [];
const rel = (p: string) => path.relative(root, p).replace(/\\/g, "/");

for (const f of walk(path.join(root, "src", "domain"))) {
  const src = readFileSync(f, "utf8");
  if (/Date\.now\(|new Date\(\s*\)|Temporal\.Now/.test(src)) problems.push(`${rel(f)}: orologio di sistema nel dominio (DEC-002)`);
  if (/\bparseFloat\(|toFixed\(|Math\.round\(/.test(src)) problems.push(`${rel(f)}: aritmetica float nel dominio (DEC-033)`);
  if (/from "(next|react|better-sqlite3|zod|node:)/.test(src)) problems.push(`${rel(f)}: import non ammesso nel dominio (06 §3.2)`);
}
for (const f of walk(path.join(root, "src"))) {
  const src = readFileSync(f, "utf8");
  if (/^\s*["']use server["']/m.test(src)) problems.push(`${rel(f)}: Server Actions vietate (DEC-091)`);
}
const sql = readdirSync(path.join(root, "db", "migrations")).map((f) => readFileSync(path.join(root, "db", "migrations", f), "utf8")).join("\n");
if (/\b(REAL|NUMERIC|DECIMAL|FLOAT)\b/i.test(sql)) problems.push("db/migrations: colonne non intere per gli importi (NFR-005)");
const triggers = readFileSync(path.join(root, "db", "sql", "triggers.sql"), "utf8");
for (const t of ["trg_audit_no_update", "trg_mov_no_update", "trg_version_no_update"]) if (!triggers.includes(t)) problems.push(`trigger mancante: ${t}`);
try {
  statSync(path.join(root, ".env"));
  const tracked = readFileSync(path.join(root, ".gitignore"), "utf8").includes(".env");
  if (!tracked) problems.push(".env non ignorato da git");
} catch {
  /* nessun .env */
}

if (problems.length) {
  console.error(`Guard: ${problems.length} violazioni\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("Guard: nessuna violazione");
