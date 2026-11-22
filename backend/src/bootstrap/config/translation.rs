use std::env;

#[derive(Debug, Clone)]
pub struct TranslationConfig {
    pub provider: String,
    pub model: String,
    pub api_key: String,
    pub base_url: Option<String>,
    pub timeout_secs: u64,
}

impl TranslationConfig {
    pub fn is_configured(&self) -> bool {
        !self.provider.trim().is_empty() && !self.api_key.trim().is_empty()
    }

    pub fn from_env() -> Self {
        Self {
            provider: env::var("TRANSLATION_PROVIDER").unwrap_or_default(),
            model: env::var("TRANSLATION_MODEL").unwrap_or_default(),
            api_key: env::var("TRANSLATION_API_KEY").unwrap_or_default(),
            base_url: env::var("TRANSLATION_BASE_URL")
                .ok()
                .filter(|s| !s.trim().is_empty()),
            timeout_secs: env::var("TRANSLATION_TIMEOUT_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(30),
        }
    }
}
