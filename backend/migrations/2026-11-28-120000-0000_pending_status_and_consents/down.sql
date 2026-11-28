DROP TABLE consent_records;
UPDATE users SET status = 'active' WHERE status = 'pending';
ALTER TABLE users DROP CONSTRAINT users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'banned'));
