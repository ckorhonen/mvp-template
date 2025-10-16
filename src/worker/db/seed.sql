-- Seed data for development
-- Run with: wrangler d1 execute DB --file=./src/worker/db/seed.sql

-- Insert sample users
INSERT INTO users (email, name, role, created_at) VALUES
  ('admin@example.com', 'Admin User', 'admin', datetime('now')),
  ('user1@example.com', 'John Doe', 'user', datetime('now')),
  ('user2@example.com', 'Jane Smith', 'user', datetime('now'));

-- Insert sample items
INSERT INTO items (user_id, title, description, status, created_at) VALUES
  (2, 'First Item', 'This is the first item', 'active', datetime('now')),
  (2, 'Second Item', 'This is the second item', 'active', datetime('now')),
  (3, 'Jane\'s Item', 'This belongs to Jane', 'active', datetime('now'));

-- Insert sample audit log
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, created_at) VALUES
  (1, 'CREATE', 'user', '2', datetime('now')),
  (1, 'CREATE', 'user', '3', datetime('now'));
