CREATE TABLE users_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

CREATE INDEX idx_users_follows_following
    ON users_follows (following_id, followed_at DESC);

CREATE INDEX idx_users_follows_follower_time
    ON users_follows (follower_id, followed_at DESC);
