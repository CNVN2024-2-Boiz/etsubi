CREATE TABLE comment_translation (
    original_comment_id UUID NOT NULL
        REFERENCES comments(id) ON DELETE CASCADE,
    language TEXT NOT NULL
        CHECK (language IN ('vi', 'en', 'ja')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (original_comment_id, language)
);

CREATE INDEX idx_comment_translation_active
    ON comment_translation (original_comment_id, language)
    WHERE deleted_at IS NULL;

SELECT diesel_manage_updated_at('comment_translation');
