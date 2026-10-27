CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('published', 'hidden')),
    comments_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_posts_status_active
    ON posts (status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_author_active
    ON posts (author_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_deleted
    ON posts (deleted_at DESC) WHERE deleted_at IS NOT NULL;
