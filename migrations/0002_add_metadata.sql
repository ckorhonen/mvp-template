-- Add metadata columns for extensibility

ALTER TABLE users ADD COLUMN metadata TEXT DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN metadata TEXT DEFAULT '{}';
