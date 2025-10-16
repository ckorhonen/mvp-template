-- ===========================================
-- Cloudflare Workers MVP Template
-- D1 Database Seed Data (for development)
-- ===========================================

-- Sample users
INSERT INTO users (email, name) VALUES
  ('alice@example.com', 'Alice Johnson'),
  ('bob@example.com', 'Bob Smith'),
  ('charlie@example.com', 'Charlie Brown');

-- Sample API keys (these are example hashes, not real)
INSERT INTO api_keys (user_id, key_hash, name) VALUES
  (1, 'hash_alice_key_1', 'Alice Development Key'),
  (2, 'hash_bob_key_1', 'Bob Development Key');

-- Sample AI requests log
INSERT INTO ai_requests (user_id, model, prompt_tokens, completion_tokens, total_tokens, request_duration_ms) VALUES
  (1, 'gpt-3.5-turbo', 50, 100, 150, 1234),
  (1, 'gpt-4', 75, 200, 275, 2345),
  (2, 'gpt-3.5-turbo', 30, 80, 110, 987);
