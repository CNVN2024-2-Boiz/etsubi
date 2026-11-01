CREATE TABLE post_translation (
    original_post_id UUID NOT NULL
        REFERENCES posts(id) ON DELETE CASCADE,
    language TEXT NOT NULL
        CHECK (language IN ('vi', 'en', 'ja')),
    title   TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (original_post_id, language)
);

CREATE INDEX idx_post_translation_active
    ON post_translation (original_post_id, language)
    WHERE deleted_at IS NULL;

SELECT diesel_manage_updated_at('post_translation');
