-- US-013: bozze della Struttura; US-101: festività aggiuntive configurabili
ALTER TABLE procedures ADD COLUMN is_draft INTEGER NOT NULL DEFAULT 0;
ALTER TABLE procedures ADD COLUMN created_by TEXT;
