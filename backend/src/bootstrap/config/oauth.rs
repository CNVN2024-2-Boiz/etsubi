use std::env;

#[derive(Debug, Clone)]
pub struct OAuthConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_url: String,
    pub issue_url: String,
}

impl OAuthConfig {
    pub fn from_env() -> Self {
        Self {
            client_id: env::var("OAUTH_CLIENT_ID").expect("OAUTH_CLIENT_ID must be set"),
            client_secret: env::var("OAUTH_CLIENT_SECRET")
                .expect("OAUTH_CLIENT_SECRET must be set."),
            redirect_url: env::var("OAUTH_REDIRECT_URI").expect("OAUTH_REDIRECT_URI must be set."),
            issue_url: env::var("OAUTH_ISSUER_URL").expect("OAUTH_ISSUER_URL must be set."),
        }
    }
}
