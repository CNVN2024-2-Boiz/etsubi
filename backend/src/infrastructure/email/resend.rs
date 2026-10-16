use std::time::Duration;

use async_trait::async_trait;
use serde_json::json;

use super::{
    service::{EmailError, EmailService},
    templates,
};

pub struct ResendEmailService {
    api_key: String,
    from: String,
    frontend_url: String,
    client: reqwest::Client,
}

impl ResendEmailService {
    pub fn new(api_key: String, from: String, frontend_url: String, timeout: Duration) -> Self {
        let client = reqwest::Client::builder()
            .timeout(timeout)
            .build()
            .expect("Failed to build reqwest client");

        Self {
            api_key,
            from,
            frontend_url,
            client,
        }
    }

    fn build_link(&self, token: &str) -> String {
        format!("{}/verify-email?token={}", self.frontend_url, token)
    }
}

#[async_trait]
impl EmailService for ResendEmailService {
    async fn send_verification(&self, to: &str, token: &str) -> Result<(), EmailError> {
        let link = self.build_link(token);
        let body = templates::render_verification(&link);

        let payload = json!({
            "from": self.from,
            "to": [to],
            "subject": "Xác thực tài khoản Etsubi",
            "html": body.html,
            "text": body.text,
        });

        let resp = self
            .client
            .post("https://api.resend.com/emails")
            .bearer_auth(&self.api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    EmailError::Timeout
                } else {
                    EmailError::Provider(e.to_string())
                }
            })?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(EmailError::Provider(format!("{}: {}", status, text)));
        }

        Ok(())
    }
}
