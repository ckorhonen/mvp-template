-- Sample seed data for development
-- Run with: wrangler d1 execute mvp-database --file=./database/seed.sql

-- Insert sample users
INSERT INTO users (email, name, password_hash, role, metadata) VALUES
    ('admin@example.com', 'Admin User', 'hashed_password_here', 'admin', '{"bio": "System administrator"}'),
    ('user@example.com', 'Regular User', 'hashed_password_here', 'user', '{"bio": "Regular user account"}'),
    ('moderator@example.com', 'Moderator User', 'hashed_password_here', 'moderator', '{"bio": "Content moderator"}');

-- Insert sample items
INSERT INTO items (user_id, title, description, status, tags, metadata) VALUES
    (1, 'Sample Item 1', 'This is a sample item for testing', 'active', '["test", "sample"]', '{"priority": "high"}'),
    (1, 'Sample Item 2', 'Another sample item', 'active', '["demo"]', '{"priority": "low"}'),
    (2, 'User Item', 'Item created by regular user', 'active', '["user-created"]', '{"priority": "medium"}');

-- Insert sample audit log entries
INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES
    (1, 'CREATE', 'user', 1, '{"event": "user_created"}'),
    (1, 'CREATE', 'item', 1, '{"event": "item_created"}'),
    (2, 'CREATE', 'item', 3, '{"event": "item_created"}');
