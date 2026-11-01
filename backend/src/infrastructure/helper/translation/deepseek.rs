use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::json;

use crate::{
    bootstrap::config::TranslationConfig,
    domains::translation::{
        client::{TranslateRequest, TranslateResult, TranslationClient},
        error::TranslationError,
    },
    infrastructure::helper::translation::{
        build_prompt, client_model, http_client, map_reqwest_error, parse_translated,
    },
};

const DEFAULT_ENDPOINT: &str = "https://api.deepseek.com/chat/completions";

pub struct DeepSeekClient {
    http: reqwest::Client,
    api_key: String,
    model: String,
    endpoint: String,
}

impl DeepSeekClient {
    pub fn from_config(cfg: &TranslationConfig) -> Result<Self> {
        Ok(Self {
            http: http_client(cfg)?,
            api_key: cfg.api_key.clone(),
            model: client_model(cfg, "deepseek"),
            endpoint: cfg
                .base_url
                .clone()
                .unwrap_or_else(|| DEFAULT_ENDPOINT.to_string()),
        })
    }
}

#[async_trait]
impl TranslationClient for DeepSeekClient {
    async fn translate(&self, req: TranslateRequest) -> Result<TranslateResult, TranslationError> {
        let (system, user) = build_prompt(&req);

        let body = json!({
            "model": self.model,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user",   "content": user   },
            ],
            "temperature": 0.2,
            "response_format": { "type": "json_object" },
        });

        let resp = self
            .http
            .post(&self.endpoint)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(map_reqwest_error)?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            tracing::warn!(%status, body = %body, "deepseek upstream error");
            return Err(if status.is_server_error() {
                TranslationError::UpstreamUnavailable
            } else {
                TranslationError::UpstreamBadResponse
            });
        }

        let parsed: ChatResponse = resp.json().await.map_err(map_reqwest_error)?;
        let content = parsed
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .ok_or(TranslationError::UpstreamBadResponse)?;

        parse_translated(&content, &req)
    }
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: Message,
}

#[derive(Debug, Deserialize)]
struct Message {
    content: String,
}
