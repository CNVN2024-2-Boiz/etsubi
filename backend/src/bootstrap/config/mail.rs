use std::env;

/// Cấu hình gửi mail. Không có `RESEND_API_KEY` thì backend chỉ ghi mail ra log (môi trường dev, test).
#[derive(Debug, Clone)]
pub struct MailConfig {
    pub resend_api_key: Option<String>,
    pub from: String,
    pub reply_to: Option<String>,
    /// Địa chỉ web dùng để dựng link trong mail, ví dụ https://etsubi.net.
    pub app_base_url: String,
    pub timeout_secs: u64,
    /// Hộp thư của đội kiểm duyệt nhận báo cáo vi phạm (`REPORT_EMAIL`, mặc định contact@etsubi.net).
    pub report_to: String,
}

impl MailConfig {
    pub fn from_env() -> Self {
        Self {
            resend_api_key: env::var("RESEND_API_KEY")
                .ok()
                .filter(|s| !s.trim().is_empty()),
            from: env::var("MAIL_FROM")
                .ok()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| "Etsubi <no-reply@etsubi.net>".into()),
            reply_to: env::var("MAIL_REPLY_TO")
                .ok()
                .filter(|s| !s.trim().is_empty()),
            app_base_url: env::var("APP_BASE_URL")
                .ok()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| "https://etsubi.net".into())
                .trim_end_matches('/')
                .to_string(),
            timeout_secs: env::var("MAIL_TIMEOUT_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(15),
            report_to: env::var("REPORT_EMAIL")
                .ok()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| "contact@etsubi.net".into()),
        }
    }
}
