UPDATE users SET language = 'vi' WHERE language NOT IN ('en', 'ja', 'vi', 'zh', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'th', 'id') OR language IS NULL;
UPDATE posts SET language = 'vi' WHERE language NOT IN ('en', 'ja', 'vi', 'zh', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'th', 'id') OR language IS NULL;
UPDATE comments SET language = 'vi' WHERE language NOT IN ('en', 'ja', 'vi', 'zh', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'th', 'id') OR language IS NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_language;
ALTER TABLE users ADD CONSTRAINT chk_users_language CHECK (language IN ('en', 'ja', 'vi', 'zh', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'th', 'id'));

ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_posts_language;
ALTER TABLE posts ADD CONSTRAINT chk_posts_language CHECK (language IN ('en', 'ja', 'vi', 'zh', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'th', 'id'));

ALTER TABLE comments DROP CONSTRAINT IF EXISTS chk_comments_language;
ALTER TABLE comments ADD CONSTRAINT chk_comments_language CHECK (language IN ('en', 'ja', 'vi', 'zh', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'th', 'id'));

CREATE INDEX IF NOT EXISTS idx_posts_language_active 
    ON posts (language, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_comments_language_active 
    ON comments (language, created_at ASC) WHERE deleted_at IS NULL;

