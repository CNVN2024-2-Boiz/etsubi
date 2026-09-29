use std::env;

pub struct ExternalConfig {
    pub translate_api_key: String,
    pub live_view_api_key: String,
    pub grammar_api_key: String,
}

impl ExternalConfig {
    pub fn from_env() -> Self {
        Self {
            translate_api_key: env::var("TRANSLATE_API_KEY")
                .expect("Please setup TRANSLATE_API_KEY properly"),
            live_view_api_key: env::var("LIVE_VIEW_API_KEY")
                .expect("Please setup LIVE_VIEW_API_KEY properly"),
            grammar_api_key: env::var("JWT_KEY").expect("Please setup GRAMMAR_API_KEY properly"),
        }
    }
}
