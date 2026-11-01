ALTER TABLE comments DROP CONSTRAINT IF EXISTS chk_comments_language;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_posts_language;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_language;

DROP INDEX IF EXISTS idx_comments_language_active;
DROP INDEX IF EXISTS idx_posts_language_active;
