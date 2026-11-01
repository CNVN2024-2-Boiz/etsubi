CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    language TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'visible'
        CHECK (status IN ('visible', 'hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_comments_post_active
    ON comments (post_id, created_at ASC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author_active
    ON comments (user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent
    ON comments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_deleted
    ON comments (deleted_at DESC) WHERE deleted_at IS NOT NULL;
