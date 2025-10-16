-- ===========================================
-- Sample Data for Development
-- ===========================================

-- Sample Users
INSERT INTO users (email, username, display_name, bio, status)
VALUES 
  ('john@example.com', 'johndoe', 'John Doe', 'Software developer and tech enthusiast', 'active'),
  ('jane@example.com', 'janesmith', 'Jane Smith', 'Designer and creative director', 'active'),
  ('bob@example.com', 'bobbuilder', 'Bob Builder', 'DevOps engineer', 'active');

-- Sample Tags
INSERT INTO tags (name, slug, description)
VALUES 
  ('Technology', 'technology', 'Posts about technology and software'),
  ('Design', 'design', 'Posts about design and creativity'),
  ('DevOps', 'devops', 'Posts about DevOps and infrastructure'),
  ('Tutorial', 'tutorial', 'Tutorial and how-to posts'),
  ('News', 'news', 'Latest news and updates');

-- Sample Posts
INSERT INTO posts (user_id, title, content, slug, status, published_at, view_count)
VALUES 
  (1, 'Getting Started with Cloudflare Workers', 'Learn how to build serverless applications with Cloudflare Workers...', 'getting-started-cloudflare-workers', 'published', datetime('now'), 150),
  (2, 'Modern Web Design Principles', 'Explore the latest trends in web design and user experience...', 'modern-web-design-principles', 'published', datetime('now'), 89),
  (3, 'CI/CD Best Practices', 'Improve your deployment pipeline with these best practices...', 'cicd-best-practices', 'published', datetime('now'), 234);

-- Sample Post Tags
INSERT INTO post_tags (post_id, tag_id)
VALUES 
  (1, 1), (1, 4),
  (2, 2), (2, 4),
  (3, 3), (3, 4);

-- Sample Comments
INSERT INTO comments (post_id, user_id, content, status)
VALUES 
  (1, 2, 'Great tutorial! Very helpful for beginners.', 'approved'),
  (1, 3, 'Thanks for sharing this. Looking forward to more content.', 'approved'),
  (2, 1, 'Love the design examples you shared!', 'approved'),
  (3, 1, 'This is exactly what I needed. Thanks!', 'approved');
