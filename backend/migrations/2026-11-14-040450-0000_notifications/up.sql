CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN (
        'follow',
        'post_created',
        'reaction',
        'comment',
        'reply',
        'muted',
        'banned',
        'post_locked',
        'post_removed'
    )),
    message TEXT NOT NULL,
    link TEXT NOT NULL,
    is_readed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_created
    ON notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id) WHERE is_readed = FALSE;

CREATE UNIQUE INDEX idx_notifications_post_created_dedup
    ON notifications (user_id, link)
    WHERE kind = 'post_created';
