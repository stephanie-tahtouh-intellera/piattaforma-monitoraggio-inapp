-- Progetti (DEC-111, incremento 4): ogni gara è collegata a un progetto.
-- Il progetto è l'«Operazione / Attività» del workbook; il codice è OP<nn>-A<attività> (stessa regola di src/domain/project.ts).
CREATE TABLE projects (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE procedures ADD COLUMN project_code TEXT REFERENCES projects(code);
CREATE INDEX idx_procedures_project ON procedures (project_code);

-- Procedure già presenti (import del workbook): un progetto per ogni Operazione/Attività
INSERT INTO projects (code, name)
SELECT DISTINCT 'OP' || lpad(x.m[1], 2, '0') || '-A' || replace(x.m[2], ' ', ''), x.operation
FROM (
  SELECT operation, regexp_match(operation, 'Operazione\s+(\d+)\s*[–-]\s*Attivit\S*\s+(.+)$') AS m
  FROM procedures WHERE operation IS NOT NULL
) x
WHERE x.m IS NOT NULL
ON CONFLICT (code) DO NOTHING;

UPDATE procedures p
SET project_code = 'OP' || lpad(x.m[1], 2, '0') || '-A' || replace(x.m[2], ' ', '')
FROM (
  SELECT id, regexp_match(operation, 'Operazione\s+(\d+)\s*[–-]\s*Attivit\S*\s+(.+)$') AS m
  FROM procedures WHERE operation IS NOT NULL
) x
WHERE p.id = x.id AND x.m IS NOT NULL;
