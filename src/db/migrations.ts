export const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS intelligences (
  type TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  strengths TEXT NOT NULL,
  in_camp TEXT NOT NULL,
  parent_advice TEXT NOT NULL
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
  photo_path TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
