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

const DEFAULT_BASE: &str = "https://generativelanguage.googleapis.com/v1beta/models";

pub struct GeminiClient {
    http: reqwest::Client,
    api_key: String,
    model: String,
    base_url: String,
}

impl GeminiClient {
    pub fn from_config(cfg: &TranslationConfig) -> Result<Self> {
        Ok(Self {
            http: http_client(cfg)?,
            api_key: cfg.api_key.clone(),
            model: client_model(cfg, "gemini"),
            base_url: cfg
                .base_url
                .clone()
                .unwrap_or_else(|| DEFAULT_BASE.to_string()),
        })
    }

    fn endpoint(&self) -> String {
        format!(
            "{}/{}:generateContent",
            self.base_url.trim_end_matches('/'),
            self.model
        )
    }
}

#[async_trait]
impl TranslationClient for GeminiClient {
    async fn translate(&self, req: TranslateRequest) -> Result<TranslateResult, TranslationError> {
        let (system, user) = build_prompt(&req);

        let body = json!({
            "systemInstruction": { "parts": [{ "text": system }] },
            "contents": [
                { "role": "user", "parts": [{ "text": user }] }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        });

        let resp = self
            .http
            .post(self.endpoint())
            .query(&[("key", self.api_key.as_str())])
            .json(&body)
            .send()
            .await
            .map_err(map_reqwest_error)?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            tracing::warn!(%status, body = %body, "gemini upstream error");
            return Err(if status.is_server_error() {
                TranslationError::UpstreamUnavailable
            } else {
                TranslationError::UpstreamBadResponse
            });
        }

        let parsed: GeminiResponse = resp.json().await.map_err(map_reqwest_error)?;
        let text = parsed
            .candidates
            .into_iter()
            .next()
            .and_then(|c| c.content.parts.into_iter().next())
            .map(|p| p.text)
            .ok_or(TranslationError::UpstreamBadResponse)?;

        parse_translated(&text, &req)
    }
}

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Vec<Candidate>,
}

#[derive(Debug, Deserialize)]
struct Candidate {
    content: Content,
}

#[derive(Debug, Deserialize)]
struct Content {
    parts: Vec<Part>,
}

#[derive(Debug, Deserialize)]
struct Part {
    text: String,
}
