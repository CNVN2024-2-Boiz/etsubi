//! Phiên bản văn bản pháp lý hiện hành. Khi sửa nội dung trang /terms/ hoặc /privacy/,
//! tăng phiên bản ở đây để bản ghi đồng ý mới ghi đúng văn bản người dùng đã đọc.

pub const TERMS_VERSION: &str = "1.0";
pub const PRIVACY_VERSION: &str = "1.1";

pub const PURPOSE_TERMS: &str = "terms_of_use";
pub const PURPOSE_PERSONAL_DATA: &str = "personal_data";

/// Hai ô đồng ý ở trang đăng ký cùng nguồn gốc của yêu cầu (IP, trình duyệt).
#[derive(Debug, Clone, Default)]
pub struct ConsentInput {
    pub accept_terms: bool,
    pub accept_privacy: bool,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}
