-- Schema iniziale (DEC-096, DEC-101). Importi *_cents INTEGER, date ISO TEXT.
CREATE TABLE system_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE structures (code TEXT PRIMARY KEY, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE suppliers (code TEXT PRIMARY KEY, name TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 1);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('STRUCTURE_USER','PROCUREMENT_OFFICER','FINANCE_OFFICER','SUPPLIER','EXECUTIVE','VALIDATOR','ADMIN')),
  structure_scope TEXT NOT NULL DEFAULT '*',
  supplier_code TEXT REFERENCES suppliers(code),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  impersonated_by INTEGER REFERENCES users(id),
  csrf_secret TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  idle_expires_at TEXT NOT NULL,
  absolute_expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE procedures (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  dataset TEXT NOT NULL,
  title TEXT NOT NULL,
  structure_code TEXT NOT NULL,
  procedure_type TEXT NOT NULL CHECK (procedure_type IN ('DIRECT_AWARD','DIRECT_AWARD_MEPA','MEPA_ORDER','CENTRAL_PURCHASING_ORDER','NEGOTIATED','OPEN','FRAMEWORK_AGREEMENT')),
  award_criterion TEXT CHECK (award_criterion IS NULL OR award_criterion IN ('LOWEST_PRICE','MEAT')),
  instrument TEXT CHECK (instrument IS NULL OR instrument IN ('MEPA','OFF_MEPA','CONSIP_AQ')),
  template_code TEXT NOT NULL,
  programmed_cents INTEGER NOT NULL CHECK (typeof(programmed_cents)='integer' AND programmed_cents >= 0),
  documents_tracked INTEGER NOT NULL DEFAULT 1,
  anac_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (typeof(anac_fee_cents)='integer' AND anac_fee_cents >= 0),
  cig TEXT,
  cup TEXT,
  source_key TEXT,
  operation TEXT,
  activity_start TEXT CHECK (activity_start IS NULL OR activity_start IS date(activity_start)),
  activity_end TEXT CHECK (activity_end IS NULL OR activity_end IS date(activity_end)),
  source_status TEXT,
  iter_text TEXT,
  source_row INTEGER,
  cancelled_at TEXT,
  cancel_reason TEXT,
  closed_at TEXT,
  current_version_id INTEGER,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE procedure_versions (
  id INTEGER PRIMARY KEY,
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  version_no INTEGER NOT NULL,
  is_baseline INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  reason TEXT NOT NULL,
  programmed_cents INTEGER NOT NULL CHECK (typeof(programmed_cents)='integer' AND programmed_cents >= 0),
  simulation_id INTEGER,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  UNIQUE (procedure_id, version_no)
);

CREATE TABLE milestone_forecasts (
  version_id INTEGER NOT NULL REFERENCES procedure_versions(id),
  milestone_code TEXT NOT NULL,
  date TEXT NOT NULL CHECK (date IS date(date)),
  PRIMARY KEY (version_id, milestone_code)
);

CREATE TABLE forecast_lines (
  id INTEGER PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES procedure_versions(id),
  line_key TEXT NOT NULL,
  date TEXT NOT NULL CHECK (date IS date(date)),
  amount_cents INTEGER NOT NULL CHECK (typeof(amount_cents)='integer' AND amount_cents >= 0),
  anchor_type TEXT NOT NULL CHECK (anchor_type IN ('MILESTONE','SAL')),
  anchor_ref TEXT NOT NULL,
  source TEXT,
  UNIQUE (version_id, line_key)
);

CREATE TABLE milestones (
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  code TEXT NOT NULL,
  actual_date TEXT CHECK (actual_date IS NULL OR actual_date IS date(actual_date)),
  manual_state TEXT CHECK (manual_state IS NULL OR manual_state IN ('SUSPENDED','NOT_APPLICABLE','CANCELLED')),
  manual_blocker TEXT,
  completed_by TEXT,
  completed_at TEXT,
  note TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (procedure_id, code)
);

CREATE TABLE budget_allocations (
  id INTEGER PRIMARY KEY,
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  year INTEGER NOT NULL,
  source TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (typeof(amount_cents)='integer' AND amount_cents >= 0),
  UNIQUE (procedure_id, year, source)
);

CREATE TABLE contracts (
  id INTEGER PRIMARY KEY,
  procedure_id INTEGER NOT NULL UNIQUE REFERENCES procedures(id),
  signed INTEGER NOT NULL DEFAULT 0,
  supplier_code TEXT REFERENCES suppliers(code),
  net_cents INTEGER NOT NULL CHECK (typeof(net_cents)='integer' AND net_cents >= 0),
  vat_cents INTEGER NOT NULL CHECK (typeof(vat_cents)='integer' AND vat_cents >= 0),
  gross_cents INTEGER NOT NULL CHECK (typeof(gross_cents)='integer' AND gross_cents >= 0),
  signed_date TEXT, start_date TEXT, end_date TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE sals (
  id INTEGER PRIMARY KEY,
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  seq INTEGER NOT NULL,
  pct_hundredths INTEGER NOT NULL CHECK (pct_hundredths BETWEEN 0 AND 10000),
  amount_cents INTEGER NOT NULL CHECK (typeof(amount_cents)='integer' AND amount_cents >= 0),
  state TEXT NOT NULL CHECK (state IN ('PLANNED','SUBMITTED','UNDER_REVIEW','ACCEPTED','INVOICED','LIQUIDATED','PARTIALLY_PAID','PAID','REJECTED','SUSPENDED')),
  due_date TEXT, submitted_date TEXT, review_due_date TEXT, invoice_date TEXT, payment_due_date TEXT,
  accepted_cents INTEGER NOT NULL DEFAULT 0 CHECK (typeof(accepted_cents)='integer' AND accepted_cents >= 0),
  liquidated_cents INTEGER NOT NULL DEFAULT 0 CHECK (typeof(liquidated_cents)='integer' AND liquidated_cents >= 0),
  note TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (procedure_id, seq),
  CHECK (liquidated_cents <= accepted_cents AND accepted_cents <= amount_cents)
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  sal_seq INTEGER,
  amount_cents INTEGER NOT NULL CHECK (typeof(amount_cents)='integer' AND amount_cents > 0),
  date TEXT NOT NULL CHECK (date IS date(date)),
  reference TEXT,
  state TEXT NOT NULL DEFAULT 'EXECUTED' CHECK (state IN ('EXECUTED','REVERSED')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE financial_movements (
  id INTEGER PRIMARY KEY,
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  type TEXT NOT NULL CHECK (type IN ('RESERVATION','COMMITMENT','LIQUIDATION','PAYMENT','RELEASE','REVERSAL')),
  amount_cents INTEGER NOT NULL CHECK (typeof(amount_cents)='integer' AND amount_cents >= 0),
  year INTEGER NOT NULL,
  date TEXT NOT NULL CHECK (date IS date(date)),
  reference TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE documents (
  id INTEGER PRIMARY KEY,
  procedure_id INTEGER REFERENCES procedures(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  doc_type TEXT,
  subtype TEXT,
  title TEXT,
  pages INTEGER,
  processing_state TEXT NOT NULL DEFAULT 'STORED',
  association_method TEXT,
  association_confidence TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  UNIQUE (sha256, procedure_id)
);

CREATE TABLE document_pages (
  document_id INTEGER NOT NULL REFERENCES documents(id),
  page_no INTEGER NOT NULL,
  text TEXT,
  method TEXT NOT NULL,
  confidence TEXT,
  PRIMARY KEY (document_id, page_no)
);

CREATE TABLE evidences (
  id INTEGER PRIMARY KEY,
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  field TEXT NOT NULL,
  value TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('SEED_FILE','DOCUMENT','MANUAL','SYSTEM_RULE')),
  document_id INTEGER REFERENCES documents(id),
  locator TEXT,
  excerpt TEXT,
  method TEXT,
  confidence TEXT,
  author TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE validation_items (
  id INTEGER PRIMARY KEY,
  procedure_id INTEGER REFERENCES procedures(id),
  kind TEXT NOT NULL CHECK (kind IN ('ASSOCIATION','EXTRACTED_FIELD','CONFLICT','OVERRIDE','RESCHEDULE')),
  field TEXT NOT NULL,
  proposed_value TEXT,
  current_value TEXT,
  document_id INTEGER REFERENCES documents(id),
  locator TEXT,
  excerpt TEXT,
  method TEXT,
  confidence TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','APPROVED','CORRECTED','REJECTED')),
  decision_value TEXT,
  decided_by TEXT,
  decided_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (procedure_id, kind, field, document_id, proposed_value)
);

CREATE TABLE alerts (
  id INTEGER PRIMARY KEY,
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  kind TEXT NOT NULL CHECK (kind IN ('ALERT','ANOMALY')),
  rule TEXT NOT NULL,
  target TEXT NOT NULL,
  due_key TEXT NOT NULL DEFAULT '',
  due_date TEXT,
  current_level TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','SUSPENDED','RESOLVED','AUTO_CLOSED')),
  owner TEXT,
  title TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  acknowledged_by TEXT, acknowledged_at TEXT,
  resolved_by TEXT, resolved_at TEXT, resolution_note TEXT,
  suspended_until TEXT, suspend_reason TEXT,
  UNIQUE (procedure_id, kind, rule, target, due_key)
);

CREATE TABLE outbox (
  id INTEGER PRIMARY KEY,
  channel TEXT NOT NULL DEFAULT 'EMAIL',
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  message_id TEXT NOT NULL,
  sent_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE alert_notifications (
  id INTEGER PRIMARY KEY,
  alert_id INTEGER NOT NULL REFERENCES alerts(id),
  level TEXT NOT NULL,
  recipient TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  channel TEXT NOT NULL CHECK (channel IN ('IN_APP','EMAIL')),
  outbox_id INTEGER REFERENCES outbox(id),
  created_at TEXT NOT NULL,
  UNIQUE (alert_id, level, recipient, channel)
);

CREATE TABLE notification_reads (
  notification_id INTEGER NOT NULL REFERENCES alert_notifications(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  read_at TEXT NOT NULL,
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE simulations (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  base_version_id INTEGER NOT NULL REFERENCES procedure_versions(id),
  source_milestone TEXT NOT NULL,
  candidate_date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('FASTEST','MIN_ANNUAL_IMPACT','MANUAL')),
  cause TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','SUPERSEDED','STALE')),
  result_json TEXT NOT NULL CHECK (json_valid(result_json)),
  blocking INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  submitted_by TEXT, submitted_at TEXT,
  decided_by TEXT, decided_at TEXT, decision_reason TEXT,
  override INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE audit_events (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  impersonated_by TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  procedure_code TEXT,
  before_json TEXT,
  after_json TEXT,
  reason TEXT,
  correlation_id TEXT NOT NULL,
  prev_hash TEXT,
  hash TEXT NOT NULL
);

CREATE TABLE jobs (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  dedupe_key TEXT UNIQUE,
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload_json)),
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','RUNNING','DONE','FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  run_at TEXT NOT NULL,
  locked_by TEXT,
  lease_until TEXT,
  last_error TEXT,
  result_json TEXT,
  created_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE leader_lease (name TEXT PRIMARY KEY, holder TEXT NOT NULL, lease_until TEXT NOT NULL);
CREATE TABLE worker_heartbeat (worker_id TEXT PRIMARY KEY, beat_at TEXT NOT NULL, version TEXT NOT NULL);

CREATE TABLE idempotency_keys (
  actor TEXT NOT NULL, key TEXT NOT NULL, route TEXT NOT NULL, request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL, status INTEGER NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (actor, key)
);

CREATE TABLE procedure_snapshot (
  procedure_id INTEGER PRIMARY KEY REFERENCES procedures(id),
  status TEXT NOT NULL,
  health TEXT NOT NULL,
  health_drivers_json TEXT NOT NULL,
  next_deadline_date TEXT,
  next_deadline_target TEXT,
  next_deadline_label TEXT,
  days_until INTEGER,
  reschedule_required INTEGER NOT NULL,
  late INTEGER NOT NULL,
  programmed_cents INTEGER NOT NULL,
  contracted_cents INTEGER,
  paid_cents INTEGER NOT NULL,
  liquidated_cents INTEGER NOT NULL,
  residual_cents INTEGER NOT NULL,
  at_risk_cents INTEGER NOT NULL,
  uncovered_cents INTEGER NOT NULL,
  slipping_cents INTEGER NOT NULL,
  open_alerts INTEGER NOT NULL,
  critical_alerts INTEGER NOT NULL,
  open_anomalies INTEGER NOT NULL,
  owner TEXT,
  reference_date TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE procedure_snapshot_year (
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  year INTEGER NOT NULL,
  need_cents INTEGER NOT NULL,
  available_cents INTEGER NOT NULL,
  PRIMARY KEY (procedure_id, year)
);

CREATE TABLE import_reports (
  id INTEGER PRIMARY KEY,
  dataset TEXT NOT NULL,
  source_file TEXT NOT NULL,
  summary_json TEXT NOT NULL CHECK (json_valid(summary_json)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE exports (
  id INTEGER PRIMARY KEY, actor TEXT NOT NULL, kind TEXT NOT NULL, filters_json TEXT NOT NULL,
  sha256 TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE INDEX idx_alerts_proc ON alerts(procedure_id, status);
CREATE INDEX idx_alerts_status ON alerts(status, severity);
CREATE INDEX idx_audit_proc ON audit_events(procedure_code, at);
CREATE INDEX idx_snapshot_health ON procedure_snapshot(health);
CREATE INDEX idx_procedures_struct ON procedures(structure_code);
CREATE INDEX idx_jobs_status ON jobs(status, run_at);
CREATE INDEX idx_notif_user ON alert_notifications(user_id, channel);
