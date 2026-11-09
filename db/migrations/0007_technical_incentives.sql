ALTER TABLE procedures
  ADD COLUMN incentives_decision TEXT CHECK (incentives_decision IS NULL OR incentives_decision IN ('YES', 'NO', 'TO_VERIFY')),
  ADD COLUMN incentives_reduce_available INTEGER NOT NULL DEFAULT 0 CHECK (incentives_reduce_available IN (0, 1));

ALTER TABLE procedure_versions
  ADD COLUMN incentives_decision TEXT CHECK (incentives_decision IS NULL OR incentives_decision IN ('YES', 'NO', 'TO_VERIFY')),
  ADD COLUMN incentive_pct_hundredths INTEGER,
  ADD COLUMN incentive_cents BIGINT,
  ADD COLUMN incentives_reduce_available INTEGER NOT NULL DEFAULT 0 CHECK (incentives_reduce_available IN (0, 1));

UPDATE procedures
SET incentives_decision = CASE WHEN has_dec = 1 THEN 'YES' ELSE 'NO' END
WHERE base_cents IS NOT NULL;

ALTER TABLE procedures DROP COLUMN has_dec;
