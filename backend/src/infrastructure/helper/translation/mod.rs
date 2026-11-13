pub mod deepseek;
pub mod gemini;

use std::sync::Arc;
use std::time::Duration;

use anyhow::{Result, anyhow};

use crate::{
    bootstrap::config::TranslationConfig,
    domains::translation::{
        client::{TranslateRequest, TranslateResult, TranslatedField, TranslationClient},
        error::TranslationError,
    },
};

pub use deepseek::DeepSeekClient;
pub use gemini::GeminiClient;

pub fn build_client(cfg: &TranslationConfig) -> Result<Option<Arc<dyn TranslationClient>>> {
    if !cfg.is_configured() {
        tracing::info!("translation: no provider configured, disabling");
        return Ok(None);
    }

    let provider = cfg.provider.trim().to_lowercase();

    let client: Arc<dyn TranslationClient> = match provider.as_str() {
        "deepseek" => Arc::new(DeepSeekClient::from_config(cfg)?),
        "gemini" => Arc::new(GeminiClient::from_config(cfg)?),
        other => {
            return Err(anyhow!(
                "unknown TRANSLATION_PROVIDER '{other}' (expected 'deepseek' or 'gemini')"
            ));
        }
    };

    tracing::info!(
        provider = %provider,
        model = %client_model(cfg, &provider),
        timeout_secs = cfg.timeout_secs,
        "translation: configured"
    );

    Ok(Some(client))
}

pub(crate) fn client_model(cfg: &TranslationConfig, provider: &str) -> String {
    if !cfg.model.trim().is_empty() {
        return cfg.model.clone();
    }
    match provider {
        "deepseek" => "deepseek-chat".into(),
        "gemini" => "gemini-2.0-flash".into(),
        _ => "default".into(),
    }
}

pub(crate) fn http_client(cfg: &TranslationConfig) -> Result<reqwest::Client> {
    Ok(reqwest::Client::builder()
        .timeout(Duration::from_secs(cfg.timeout_secs.max(1)))
        .build()?)
}

pub(crate) fn map_reqwest_error(e: reqwest::Error) -> TranslationError {
    if e.is_timeout() {
        TranslationError::UpstreamTimeout
    } else if e.is_connect() || e.is_request() {
        TranslationError::UpstreamUnavailable
    } else {
        TranslationError::UpstreamBadResponse
    }
}

pub(crate) fn build_prompt(req: &TranslateRequest) -> (String, String) {
    let keys: Vec<&str> = req.fields.iter().map(|f| f.key.as_str()).collect();
    let system = format!(
        "You are a professional translator. Translate the provided fields from `{}` to `{}`. \
         Reply with a single JSON object whose keys exactly match: {}. \
         Do not add explanations, do not wrap the JSON in code fences. \
         Preserve meaning, tone, and formatting of the source.",
        req.source_lang,
        req.target_lang,
        keys.join(", "),
    );

    let mut payload = serde_json::Map::new();
    for f in &req.fields {
        payload.insert(f.key.clone(), serde_json::Value::String(f.text.clone()));
    }
    let body = serde_json::to_string(&payload).unwrap_or_else(|_| "{}".into());

    let user = match req.context.as_deref() {
        Some(ctx) if !ctx.trim().is_empty() => {
            format!("Context:\n{ctx}\n\nText (JSON):\n{body}")
        }
        _ => format!("Text (JSON):\n{body}"),
    };

    (system, user)
}

pub(crate) fn parse_translated(
    raw: &str,
    req: &TranslateRequest,
) -> Result<TranslateResult, TranslationError> {
    let cleaned = strip_code_fence(raw);
    let value: serde_json::Value =
        serde_json::from_str(&cleaned).map_err(|_| TranslationError::UpstreamBadResponse)?;
    let obj = value
        .as_object()
        .ok_or(TranslationError::UpstreamBadResponse)?;

    let mut fields = Vec::with_capacity(req.fields.len());
    for f in &req.fields {
        let text = obj
            .get(&f.key)
            .and_then(|v| v.as_str())
            .ok_or(TranslationError::UpstreamBadResponse)?;
        fields.push(TranslatedField {
            key: f.key.clone(),
            text: text.to_string(),
        });
    }
    Ok(TranslateResult { fields })
}

fn strip_code_fence(s: &str) -> String {
    let t = s.trim();
    for prefix in ["```json", "```JSON", "```"] {
        if let Some(rest) = t.strip_prefix(prefix) {
            let rest = rest.trim_start_matches(['\n', '\r']);
            let rest = rest.strip_suffix("```").unwrap_or(rest);
            return rest.trim().to_string();
        }
    }
    t.to_string()
}
