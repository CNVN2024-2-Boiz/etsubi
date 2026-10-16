use async_trait::async_trait;

use super::{
    service::{EmailError, EmailService},
    templates,
};

pub struct ConsoleEmailService {
    frontend_url: String,
}

impl ConsoleEmailService {
    pub fn new(frontend_url: String) -> Self {
        Self { frontend_url }
    }

    fn build_link(&self, token: &str) -> String {
        format!("{}/verify-email?token={}", self.frontend_url, token)
    }
}

#[async_trait]
impl EmailService for ConsoleEmailService {
    async fn send_verification(&self, to: &str, token: &str) -> Result<(), EmailError> {
        let link = self.build_link(token);
        let body = templates::render_verification(&link);

        tracing::info!(
            "\n\
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\
            📧 [DEV EMAIL]\n\
               To:      {}\n\
               Subject: Xác thực tài khoản Etsubi\n\
               Link:    {}\n\
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\
            HTML length: {} chars, TEXT length: {} chars",
            to,
            link,
            body.html.len(),
            body.text.len(),
        );

        Ok(())
    }
}
