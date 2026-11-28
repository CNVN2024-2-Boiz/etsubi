-- Tài khoản mới ở trạng thái 'pending' cho tới khi bấm link xác nhận trong mail.
-- Tài khoản cũ vẫn là 'active' nên không bị ảnh hưởng.
ALTER TABLE users DROP CONSTRAINT users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
    CHECK (status IN ('pending', 'active', 'banned'));

-- Bằng chứng đồng ý (Luật 91/2025/QH15, NĐ 356/2025/NĐ-CP Điều 6): ai đồng ý,
-- đồng ý mục đích nào, theo phiên bản văn bản nào, lúc nào và từ đâu.
-- Xoá tài khoản thì bản ghi cũng bị xoá vì không còn xử lý dữ liệu của người đó.
CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('terms_of_use', 'personal_data')),
    document_version TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_records_user ON consent_records (user_id, granted_at DESC);
