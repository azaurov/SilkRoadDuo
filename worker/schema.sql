CREATE TABLE IF NOT EXISTS profile_sync (
  profile_id TEXT PRIMARY KEY,
  token      TEXT NOT NULL,
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
