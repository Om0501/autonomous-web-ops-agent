const Database = require("better-sqlite3");
const path = require("path");

// SQLite for local/demo use. The schema below is written in a Postgres-
// compatible style (explicit types, no SQLite-only shortcuts) so moving to
// PostgreSQL/Supabase for production is a driver swap, not a redesign.
const db = new Database(path.join(__dirname, "..", "webops.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  workflow TEXT NOT NULL,
  destination TEXT NOT NULL,
  frequency TEXT NOT NULL,
  routing TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  state TEXT NOT NULL,          -- planned | running | extracting | comparing | completed | failed
  plan_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  raw_html TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS extracted_records (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  field TEXT NOT NULL,
  value TEXT,
  snippet TEXT,
  confidence REAL NOT NULL,
  note TEXT,
  fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comparisons (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  source TEXT NOT NULL,
  field TEXT NOT NULL,
  prev_value TEXT,
  new_value TEXT,
  change_type TEXT NOT NULL,   -- material-change | low-confidence | stable
  confidence REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS summaries (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  headline TEXT NOT NULL,
  owner TEXT NOT NULL,
  material_count INTEGER NOT NULL,
  uncertain_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  verdict TEXT NOT NULL,        -- accepted | rejected
  note TEXT,
  created_at TEXT NOT NULL
);
`);

module.exports = db;
