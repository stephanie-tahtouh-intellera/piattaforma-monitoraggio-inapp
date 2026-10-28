-- Trigger idempotenti riapplicati dopo ogni migrazione (DEC-096, CR-39; porting Postgres in DEC-115).
-- Tabelle append-only: audit, movimenti finanziari, versioni, previsioni, notifiche.
-- Nota: le WHEN clause dei trigger Postgres non ammettono subquery, quindi il controllo su
-- system_meta.reset_in_progress è spostato dentro il corpo della funzione (non nella WHEN).

CREATE OR REPLACE FUNCTION trg_audit_no_update_fn() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_APPEND_ONLY';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_events;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit_events FOR EACH ROW EXECUTE FUNCTION trg_audit_no_update_fn();

CREATE OR REPLACE FUNCTION trg_audit_no_delete_fn() RETURNS trigger AS $$
BEGIN
  IF (SELECT value FROM system_meta WHERE key = 'reset_in_progress') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'AUDIT_APPEND_ONLY';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_audit_no_delete ON audit_events;
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION trg_audit_no_delete_fn();

CREATE OR REPLACE FUNCTION trg_mov_no_update_fn() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'MOVEMENT_APPEND_ONLY';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_mov_no_update ON financial_movements;
CREATE TRIGGER trg_mov_no_update BEFORE UPDATE ON financial_movements FOR EACH ROW EXECUTE FUNCTION trg_mov_no_update_fn();

CREATE OR REPLACE FUNCTION trg_mov_no_delete_fn() RETURNS trigger AS $$
BEGIN
  IF (SELECT value FROM system_meta WHERE key = 'reset_in_progress') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'MOVEMENT_APPEND_ONLY';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_mov_no_delete ON financial_movements;
CREATE TRIGGER trg_mov_no_delete BEFORE DELETE ON financial_movements FOR EACH ROW EXECUTE FUNCTION trg_mov_no_delete_fn();

CREATE OR REPLACE FUNCTION trg_version_no_update_fn() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VERSION_IMMUTABLE';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_version_no_update ON procedure_versions;
CREATE TRIGGER trg_version_no_update BEFORE UPDATE ON procedure_versions
  FOR EACH ROW
  WHEN (NOT (OLD.approved_at IS NULL AND NEW.approved_at IS NOT NULL
             AND NEW.procedure_id = OLD.procedure_id AND NEW.version_no = OLD.version_no
             AND NEW.programmed_cents = OLD.programmed_cents AND NEW.is_baseline = OLD.is_baseline))
  EXECUTE FUNCTION trg_version_no_update_fn();

CREATE OR REPLACE FUNCTION trg_version_no_delete_fn() RETURNS trigger AS $$
BEGIN
  IF (SELECT value FROM system_meta WHERE key = 'reset_in_progress') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'VERSION_IMMUTABLE';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_version_no_delete ON procedure_versions;
CREATE TRIGGER trg_version_no_delete BEFORE DELETE ON procedure_versions FOR EACH ROW EXECUTE FUNCTION trg_version_no_delete_fn();

CREATE OR REPLACE FUNCTION trg_mf_no_update_fn() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VERSION_IMMUTABLE';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_mf_no_update ON milestone_forecasts;
CREATE TRIGGER trg_mf_no_update BEFORE UPDATE ON milestone_forecasts FOR EACH ROW EXECUTE FUNCTION trg_mf_no_update_fn();

CREATE OR REPLACE FUNCTION trg_mf_no_delete_fn() RETURNS trigger AS $$
BEGIN
  IF (SELECT value FROM system_meta WHERE key = 'reset_in_progress') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'VERSION_IMMUTABLE';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_mf_no_delete ON milestone_forecasts;
CREATE TRIGGER trg_mf_no_delete BEFORE DELETE ON milestone_forecasts FOR EACH ROW EXECUTE FUNCTION trg_mf_no_delete_fn();

CREATE OR REPLACE FUNCTION trg_fl_no_update_fn() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VERSION_IMMUTABLE';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_fl_no_update ON forecast_lines;
CREATE TRIGGER trg_fl_no_update BEFORE UPDATE ON forecast_lines FOR EACH ROW EXECUTE FUNCTION trg_fl_no_update_fn();

CREATE OR REPLACE FUNCTION trg_fl_no_delete_fn() RETURNS trigger AS $$
BEGIN
  IF (SELECT value FROM system_meta WHERE key = 'reset_in_progress') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'VERSION_IMMUTABLE';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_fl_no_delete ON forecast_lines;
CREATE TRIGGER trg_fl_no_delete BEFORE DELETE ON forecast_lines FOR EACH ROW EXECUTE FUNCTION trg_fl_no_delete_fn();

CREATE OR REPLACE FUNCTION trg_notif_no_update_fn() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'NOTIFICATION_APPEND_ONLY';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_notif_no_update ON alert_notifications;
CREATE TRIGGER trg_notif_no_update BEFORE UPDATE ON alert_notifications FOR EACH ROW EXECUTE FUNCTION trg_notif_no_update_fn();

-- Ricerca full-text del portafoglio (US-011, CR-49), porting Postgres (DEC-115): tabella normale con
-- colonna tsvector generata al posto della virtual table FTS5 di SQLite.
CREATE TABLE IF NOT EXISTS procedure_search (
  code TEXT PRIMARY KEY,
  title TEXT,
  structure TEXT,
  cig TEXT,
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(structure, '') || ' ' || coalesce(cig, ''))) STORED
);
CREATE INDEX IF NOT EXISTS idx_procedure_search_vector ON procedure_search USING GIN (search_vector);
