use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub server_host: String,
    pub server_port: u16,

    pub database_url: String,

    pub jwt_key: String,
    pub jwt_expiry_hours: i64,

    pub cors_allowed_origins: String,

    pub deep_seek_api_key: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

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

            cors_allowed_origins: env::var("CORS_ALLOWED_ORIGINS").unwrap_or_else(|_| "*".into()),

            deep_seek_api_key: env::var("DEEP_SEEK_API_KEY").unwrap_or_else(|_| "".into()),
        }
    }
}
