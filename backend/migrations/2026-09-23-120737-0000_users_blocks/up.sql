CREATE TABLE users_blocks (
  blocker_id BIGINT REFERENCES users(id),
  blocked_id BIGINT REFERENCES users(id),
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
)
