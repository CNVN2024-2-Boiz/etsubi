CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('published', 'hidden')),
    comments_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE posts ADD CONSTRAINT posts_location_check CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (
        latitude  BETWEEN -90  AND 90
    AND longitude BETWEEN -180 AND 180
    )
);

CREATE INDEX idx_posts_status_active
    ON posts (status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_author_active
    ON posts (author_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_deleted
    ON posts (deleted_at DESC) WHERE deleted_at IS NOT NULL;
