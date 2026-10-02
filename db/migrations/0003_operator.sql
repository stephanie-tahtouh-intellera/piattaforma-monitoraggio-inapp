-- Operatore economico individuato prima del contratto (DEC-107): vede la pratica e svolge i passi del Fornitore
ALTER TABLE procedures ADD COLUMN operator_code TEXT REFERENCES suppliers(code);
