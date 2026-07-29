// "7. Storage, scheduling and reliability" — minimal record only. The full
// message body is deliberately not persisted; the report links back to the
// provider's own web UI instead of duplicating sensitive content at rest.
//
// message_id is only unique per mailbox provider (Outlook and Gmail have
// separate id spaces), so provider + message_id is the composite key, and
// checkpoints/errors are scoped per provider too — the two mailboxes have
// independent read progress.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS processed_emails (
  provider         TEXT NOT NULL,
  message_id       TEXT NOT NULL,
  conversation_id  TEXT NOT NULL,
  received_at      TEXT NOT NULL,
  sender_address   TEXT NOT NULL,
  subject          TEXT NOT NULL,
  summary          TEXT NOT NULL,
  category         TEXT NOT NULL,
  score            INTEGER NOT NULL,
  level            TEXT NOT NULL,
  action           TEXT,
  deadline         TEXT,
  sensitive        INTEGER NOT NULL,
  confidence       REAL NOT NULL,
  web_link         TEXT NOT NULL,
  analysis_version TEXT NOT NULL,
  processed_at     TEXT NOT NULL,
  PRIMARY KEY (provider, message_id)
);

CREATE TABLE IF NOT EXISTS run_checkpoints (
  job_name         TEXT PRIMARY KEY,
  last_success_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processing_errors (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider     TEXT NOT NULL,
  message_id   TEXT NOT NULL,
  subject      TEXT NOT NULL,
  run_at       TEXT NOT NULL,
  error        TEXT NOT NULL
);
`;
