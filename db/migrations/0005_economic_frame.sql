-- Quadro economico della bozza (DEC-111): base di gara, IVA, tassa gara (anac_fee_cents esiste già), DEC e incentivi
ALTER TABLE procedures ADD COLUMN base_cents INTEGER CHECK (base_cents IS NULL OR (typeof(base_cents)='integer' AND base_cents >= 0));
ALTER TABLE procedures ADD COLUMN vat_pct_hundredths INTEGER NOT NULL DEFAULT 2200 CHECK (typeof(vat_pct_hundredths)='integer' AND vat_pct_hundredths >= 0);
ALTER TABLE procedures ADD COLUMN has_dec INTEGER NOT NULL DEFAULT 0 CHECK (has_dec IN (0, 1));
ALTER TABLE procedures ADD COLUMN incentive_pct_hundredths INTEGER NOT NULL DEFAULT 0 CHECK (typeof(incentive_pct_hundredths)='integer' AND incentive_pct_hundredths >= 0);
ALTER TABLE procedures ADD COLUMN incentive_cents INTEGER NOT NULL DEFAULT 0 CHECK (typeof(incentive_cents)='integer' AND incentive_cents >= 0);
