-- ===========================================
-- Seed Data for Development
-- MVP Template - D1 Database
-- ===========================================

-- Sample Users
INSERT INTO users (id, email, username, full_name, bio, is_active, is_verified, created_at, updated_at) VALUES
  ('user_1', 'alice@example.com', 'alice', 'Alice Johnson', 'Full-stack developer passionate about building great products', 1, 1, unixepoch(), unixepoch()),
  ('user_2', 'bob@example.com', 'bob', 'Bob Smith', 'Product designer and UX enthusiast', 1, 1, unixepoch(), unixepoch()),
  ('user_3', 'charlie@example.com', 'charlie', 'Charlie Brown', 'Content creator and writer', 1, 1, unixepoch(), unixepoch());

-- Sample Posts
INSERT INTO posts (id, user_id, title, content, slug, excerpt, status, published_at, created_at, updated_at) VALUES
  ('post_1', 'user_1', 'Getting Started with Cloudflare Workers', 'Cloudflare Workers is a serverless platform...', 'getting-started-cloudflare-workers', 'Learn the basics of Cloudflare Workers', 'published', unixepoch(), unixepoch(), unixepoch()),
  ('post_2', 'user_1', 'Building APIs with D1 Database', 'D1 is Cloudflare''s native SQL database...', 'building-apis-d1-database', 'How to use D1 for your API backend', 'published', unixepoch(), unixepoch(), unixepoch()),
  ('post_3', 'user_2', 'Design Principles for MVPs', 'When building an MVP, focus on...', 'design-principles-mvps', 'Essential design principles for MVPs', 'published', unixepoch(), unixepoch(), unixepoch()),
  ('post_4', 'user_3', 'Content Strategy for Startups', 'A solid content strategy is crucial...', 'content-strategy-startups', 'Building a content strategy from scratch', 'draft', NULL, unixepoch(), unixepoch());

-- Sample Comments
INSERT INTO comments (id, post_id, user_id, parent_id, content, created_at, updated_at) VALUES
  ('comment_1', 'post_1', 'user_2', NULL, 'Great article! Very helpful for getting started.', unixepoch(), unixepoch()),
  ('comment_2', 'post_1', 'user_1', 'comment_1', 'Thanks Bob! Glad you found it useful.', unixepoch(), unixepoch()),
  ('comment_3', 'post_2', 'user_3', NULL, 'Can you cover R2 storage next?', unixepoch(), unixepoch());
