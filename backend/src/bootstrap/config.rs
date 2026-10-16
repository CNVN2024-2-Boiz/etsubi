use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub server_host: String,
    pub server_port: u16,

    pub database_url: String,

    pub jwt_key: String,
    pub jwt_expiry_hours: i64,

    pub email_provider: String,
    pub resend_api_key: String,
    pub email_from: String,
    pub frontend_url: String,
    pub email_timeout_secs: u64,
}

impl AppConfig {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let email_provider = env::var("EMAIL_PROVIDER").unwrap_or_else(|_| "console".into());
        if !matches!(email_provider.as_str(), "console" | "resend") {
            panic!(
                "EMAIL_PROVIDER must be 'console' or 'resend', got: {}",
                email_provider
            );
        }

        let resend_api_key = if email_provider == "resend" {
            env::var("RESEND_API_KEY")
                .expect("RESEND_API_KEY must be set when EMAIL_PROVIDER=resend")
        } else {
            env::var("RESEND_API_KEY").unwrap_or_default()
        };

        Self {
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            server_port: env::var("SERVER_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(8080),

            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),

            jwt_key: env::var("JWT_KEY").expect("JWT_KEY must be set"),
            jwt_expiry_hours: env::var("JWT_EXPIRY_HOURS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(24),

            email_provider,
            resend_api_key,
            email_from: env::var("EMAIL_FROM")
                .unwrap_or_else(|_| "Etsubi <onboarding@resend.dev>".into()),
            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:3000".into()),
            email_timeout_secs: env::var("EMAIL_TIMEOUT_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10),
        }
    }
}
