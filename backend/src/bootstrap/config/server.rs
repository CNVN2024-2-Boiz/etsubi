use std::env;

#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub jwt_key: String,
    pub jwt_expiry_hours: i64,
    pub cors_allowed_origins: String,
}

impl ServerConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: env::var("SERVER_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(8080),
            jwt_key: env::var("JWT_KEY").expect("JWT_KEY must be set"),
            jwt_expiry_hours: env::var("JWT_EXPIRY_HOURS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(24),
            cors_allowed_origins: env::var("CORS_ALLOWED_ORIGINS").unwrap_or_else(|_| "*".into()),
        }
    }
}
