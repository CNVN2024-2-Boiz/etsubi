CREATE TABLE reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    reacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_reactions_post ON reactions (post_id);
CREATE INDEX idx_reactions_post_emoji ON reactions (post_id, emoji);
