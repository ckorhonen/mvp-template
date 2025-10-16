-- Sample Data for Development
-- Run with: wrangler d1 execute DB --file=migrations/0002_sample_data.sql

-- Insert sample users
INSERT INTO users (email, name, created_at) VALUES
  ('admin@example.com', 'Admin User', datetime('now')),
  ('user@example.com', 'Test User', datetime('now')),
  ('demo@example.com', 'Demo User', datetime('now'));

-- Insert sample settings
INSERT INTO settings (key, value, description, created_at) VALUES
  ('site_name', 'MVP Template', 'The name of the site', datetime('now')),
  ('site_description', 'A powerful MVP template built with Cloudflare Workers', 'Site description', datetime('now')),
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode', datetime('now')),
  ('max_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)', datetime('now'));

-- Insert sample posts
INSERT INTO posts (user_id, title, content, slug, published, published_at, created_at) VALUES
  (1, 'Welcome to MVP Template', 'This is your first post. Edit or delete it to get started!', 'welcome-to-mvp-template', 1, datetime('now'), datetime('now')),
  (1, 'Getting Started Guide', 'Learn how to build with Cloudflare Workers and this template.', 'getting-started-guide', 1, datetime('now'), datetime('now')),
  (2, 'Draft Post', 'This is a draft post that is not yet published.', 'draft-post', 0, NULL, datetime('now'));
