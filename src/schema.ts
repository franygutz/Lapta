export const SCHEMA =
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS readings(id INTEGER PRIMARY KEY, time INTEGER NOT NULL, source TEXT NOT NULL, device TEXT NOT NULL, payload TEXT NOT NULL); CREATE INDEX IF NOT EXISTS reading_time ON readings(source,time); CREATE TABLE IF NOT EXISTS preferences(key TEXT PRIMARY KEY,value TEXT NOT NULL);";
