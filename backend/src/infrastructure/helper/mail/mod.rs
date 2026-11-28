//! Gửi email giao dịch (xác nhận email, đặt lại mật khẩu, báo đổi mật khẩu).
//!
//! - Có `RESEND_API_KEY`: gửi qua Resend (https://resend.com) trên một luồng riêng,
//!   request API không phải chờ mail đi xong.
//! - Không có key (dev, test): chỉ ghi log và giữ mail trong bộ nhớ (`take_outbox`)
//!   để test đọc được link.

pub mod templates;

use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use serde_json::json;

use crate::bootstrap::config::mail::MailConfig;

/// Một email đã dựng xong nội dung, sẵn sàng gửi.
#[derive(Debug, Clone)]
pub struct OutgoingMail {
    pub to: String,
    pub subject: String,
    pub html: String,
    pub text: String,
}

pub trait Mailer: Send + Sync {
    /// Gửi mail; lỗi chỉ được ghi log để không làm hỏng thao tác chính (đăng ký, đổi mật khẩu).
    fn send(&self, mail: OutgoingMail);
}

/// Tạo mailer theo cấu hình: Resend khi có API key, còn lại ghi log.
pub fn build_mailer(config: &MailConfig) -> Arc<dyn Mailer> {
    match &config.resend_api_key {
        Some(key) => Arc::new(ResendMailer {
            api_key: key.clone(),
            from: config.from.clone(),
            reply_to: config.reply_to.clone(),
            timeout: Duration::from_secs(config.timeout_secs),
        }),
        None => {
            tracing::warn!("RESEND_API_KEY is not set: emails are logged, not sent");
            Arc::new(LogMailer)
        }
    }
}

const RESEND_ENDPOINT: &str = "https://api.resend.com/emails";

pub struct ResendMailer {
    api_key: String,
    from: String,
    reply_to: Option<String>,
    timeout: Duration,
}

impl Mailer for ResendMailer {
    fn send(&self, mail: OutgoingMail) {
        let api_key = self.api_key.clone();
        let timeout = self.timeout;
        let mut body = json!({
            "from": self.from,
            "to": [mail.to],
            "subject": mail.subject,
            "html": mail.html,
            "text": mail.text,
        });
        if let Some(reply_to) = &self.reply_to {
            body["reply_to"] = json!(reply_to);
        }

        // Gửi trên luồng riêng: Resend chậm hoặc lỗi cũng không giữ request của người dùng.
        std::thread::spawn(move || {
            let client = match reqwest::blocking::Client::builder().timeout(timeout).build() {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!(error = %e, "mail: cannot build HTTP client");
                    return;
                }
            };
            match client
                .post(RESEND_ENDPOINT)
                .bearer_auth(api_key)
                .json(&body)
                .send()
            {
                Ok(res) if res.status().is_success() => {
                    tracing::info!(subject = %body["subject"], "mail: sent via Resend");
                }
                Ok(res) => {
                    let status = res.status();
                    let detail = res.text().unwrap_or_default();
                    tracing::error!(%status, %detail, "mail: Resend rejected the email");
                }
                Err(e) => tracing::error!(error = %e, "mail: request to Resend failed"),
            }
        });
    }
}

/// Mailer cho dev và test: ghi tiêu đề ra log và giữ mail trong bộ nhớ.
pub struct LogMailer;

fn outbox() -> &'static Mutex<Vec<OutgoingMail>> {
    static OUTBOX: OnceLock<Mutex<Vec<OutgoingMail>>> = OnceLock::new();
    OUTBOX.get_or_init(|| Mutex::new(Vec::new()))
}

impl Mailer for LogMailer {
    fn send(&self, mail: OutgoingMail) {
        // Chỉ chạy khi chưa cấu hình Resend (dev, test): in cả nội dung chữ để lấy được link thử.
        tracing::info!(to = %mail.to, subject = %mail.subject, text = %mail.text, "mail (not sent, no RESEND_API_KEY)");
        if let Ok(mut box_) = outbox().lock() {
            // Giữ tối đa 200 mail gần nhất để bộ nhớ không tăng mãi khi chạy dev lâu.
            if box_.len() >= 200 {
                box_.remove(0);
            }
            box_.push(mail);
        }
    }
}

/// Lấy (và xoá) các mail mà `LogMailer` đã nhận gửi tới địa chỉ `to`. Dùng trong test.
pub fn take_outbox(to: &str) -> Vec<OutgoingMail> {
    let Ok(mut box_) = outbox().lock() else {
        return Vec::new();
    };
    let (mine, rest): (Vec<_>, Vec<_>) = box_.drain(..).partition(|m| m.to == to);
    *box_ = rest;
    mine
}
