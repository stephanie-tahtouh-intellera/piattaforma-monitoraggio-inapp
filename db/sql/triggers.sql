-- Trigger idempotenti riapplicati dopo ogni migrazione (DEC-096, CR-39).
-- Tabelle append-only: audit, movimenti finanziari, versioni, previsioni, notifiche.
DROP TRIGGER IF EXISTS trg_audit_no_update;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'AUDIT_APPEND_ONLY'); END;
DROP TRIGGER IF EXISTS trg_audit_no_delete;
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_events WHEN (SELECT value FROM system_meta WHERE key='reset_in_progress') IS NOT '1' BEGIN SELECT RAISE(ABORT, 'AUDIT_APPEND_ONLY'); END;

DROP TRIGGER IF EXISTS trg_mov_no_update;
CREATE TRIGGER trg_mov_no_update BEFORE UPDATE ON financial_movements BEGIN SELECT RAISE(ABORT, 'MOVEMENT_APPEND_ONLY'); END;
DROP TRIGGER IF EXISTS trg_mov_no_delete;
CREATE TRIGGER trg_mov_no_delete BEFORE DELETE ON financial_movements WHEN (SELECT value FROM system_meta WHERE key='reset_in_progress') IS NOT '1' BEGIN SELECT RAISE(ABORT, 'MOVEMENT_APPEND_ONLY'); END;

DROP TRIGGER IF EXISTS trg_version_no_update;
CREATE TRIGGER trg_version_no_update BEFORE UPDATE ON procedure_versions
  WHEN NOT (OLD.approved_at IS NULL AND NEW.approved_at IS NOT NULL
            AND NEW.procedure_id = OLD.procedure_id AND NEW.version_no = OLD.version_no
            AND NEW.programmed_cents = OLD.programmed_cents AND NEW.is_baseline = OLD.is_baseline)
  BEGIN SELECT RAISE(ABORT, 'VERSION_IMMUTABLE'); END;
DROP TRIGGER IF EXISTS trg_version_no_delete;
CREATE TRIGGER trg_version_no_delete BEFORE DELETE ON procedure_versions WHEN (SELECT value FROM system_meta WHERE key='reset_in_progress') IS NOT '1' BEGIN SELECT RAISE(ABORT, 'VERSION_IMMUTABLE'); END;

DROP TRIGGER IF EXISTS trg_mf_no_update;
CREATE TRIGGER trg_mf_no_update BEFORE UPDATE ON milestone_forecasts BEGIN SELECT RAISE(ABORT, 'VERSION_IMMUTABLE'); END;
DROP TRIGGER IF EXISTS trg_mf_no_delete;
CREATE TRIGGER trg_mf_no_delete BEFORE DELETE ON milestone_forecasts WHEN (SELECT value FROM system_meta WHERE key='reset_in_progress') IS NOT '1' BEGIN SELECT RAISE(ABORT, 'VERSION_IMMUTABLE'); END;

DROP TRIGGER IF EXISTS trg_fl_no_update;
CREATE TRIGGER trg_fl_no_update BEFORE UPDATE ON forecast_lines BEGIN SELECT RAISE(ABORT, 'VERSION_IMMUTABLE'); END;
DROP TRIGGER IF EXISTS trg_fl_no_delete;
CREATE TRIGGER trg_fl_no_delete BEFORE DELETE ON forecast_lines WHEN (SELECT value FROM system_meta WHERE key='reset_in_progress') IS NOT '1' BEGIN SELECT RAISE(ABORT, 'VERSION_IMMUTABLE'); END;

DROP TRIGGER IF EXISTS trg_notif_no_update;
CREATE TRIGGER trg_notif_no_update BEFORE UPDATE ON alert_notifications BEGIN SELECT RAISE(ABORT, 'NOTIFICATION_APPEND_ONLY'); END;

-- Ricerca full-text del portafoglio (US-011, CR-49)
CREATE VIRTUAL TABLE IF NOT EXISTS procedure_search USING fts5(code, title, structure, cig, tokenize = 'unicode61 remove_diacritics 2');
