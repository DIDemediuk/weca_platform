export const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS intelligences (
  type TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  strengths TEXT NOT NULL,
  in_camp TEXT NOT NULL,
  parent_advice TEXT NOT NULL,
  hobbies TEXT NOT NULL DEFAULT '',
  professions TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  child_name TEXT NOT NULL,
  shift TEXT NOT NULL,
  primary_type TEXT NOT NULL,
  secondary_type TEXT,
  example TEXT NOT NULL,
  woven_example TEXT NOT NULL,
  talent_bridge TEXT NOT NULL DEFAULT '',
  photo_path TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS report_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT NOT NULL REFERENCES reports(id),
  event_type TEXT NOT NULL CHECK(event_type IN ('created','downloaded')),
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_report_events_report_id ON report_events(report_id);
CREATE TABLE IF NOT EXISTS usage_quota (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  remaining INTEGER NOT NULL,
  unlimited INTEGER NOT NULL DEFAULT 0,
  access_enabled INTEGER NOT NULL DEFAULT 1
);
INSERT OR IGNORE INTO usage_quota (id, remaining, unlimited, access_enabled) VALUES (1, 10, 0, 1);
`;
