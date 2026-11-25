-- Metodo di calcolo degli incentivi (DEC-147): FLAT_PCT = percentuale unica indicata a mano (regola originaria, seed e bozze precedenti);
-- SCALED = scaglioni progressivi con quota 80% e IRAP a carico dell'importo a disposizione (regole ricevute da INAPP il 2026-11-25).
ALTER TABLE procedures ADD COLUMN incentive_method TEXT NOT NULL DEFAULT 'FLAT_PCT' CHECK (incentive_method IN ('FLAT_PCT', 'SCALED'));
