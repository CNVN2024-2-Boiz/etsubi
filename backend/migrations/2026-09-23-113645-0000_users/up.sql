CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    displayname TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    institute TEXT,
    address TEXT,
    native TEXT NOT NULL DEFAULT 'vi' CHECK (native IN ('vi', 'en', 'ja')),
    language TEXT NOT NULL DEFAULT 'vi' CHECK (language IN ('vi', 'en', 'ja')),
    password TEXT,
    avatar_url TEXT,
    bio TEXT,
    role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'moderator', 'admin')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'banned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    muted_until TIMESTAMPTZ,
    token_version INTEGER NOT NULL DEFAULT 0,
    oauth_provider TEXT,
    oauth_subject TEXT,
    profile_completed_at TIMESTAMPTZ
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_muted ON users (muted_until) WHERE muted_until IS NOT NULL;
CREATE UNIQUE INDEX idx_users_oauth ON users (oauth_provider, oauth_subject) WHERE oauth_provider IS NOT NULL;

ALTER TABLE users ADD CONSTRAINT users_username_format
    CHECK (username ~ '^[a-z0-9._]{3,30}$');
