-- Migration: 0004_files
-- Description: Add files metadata table for R2 tracking
-- Created: 2024-01-01

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  bucket TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_key ON files(key);
CREATE INDEX idx_files_created_at ON files(created_at);
