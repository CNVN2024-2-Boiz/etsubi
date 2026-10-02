use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub server_host: String,
    pub server_port: u16,

    pub database_url: String,
    pub database_name: String,
    pub database_user: String,
    pub database_password: String,
    pub database_port: u16,

    pub jwt_key: String,
    pub jwt_expiry_hours: i64,

    pub translate_api_key: String,
    pub live_view_api_key: String,
    pub grammar_api_key: String,
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
            database_name: env::var("DATABASE_NAME").expect("DATABASE_NAME must be set"),
            database_user: env::var("DATABASE_USER").expect("DATABASE_USER must be set"),
            database_password: env::var("DATABASE_PASSWORD")
                .expect("DATABASE_PASSWORD must be set"),
            database_port: env::var("DATABASE_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(5432),

            jwt_key: env::var("JWT_KEY").expect("JWT_KEY must be set"),
            jwt_expiry_hours: env::var("JWT_EXPIRY_HOURS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(24),

            translate_api_key: env::var("TRANSLATE_API_KEY").unwrap_or_default(),
            live_view_api_key: env::var("LIVE_VIEW_API_KEY").unwrap_or_default(),
            grammar_api_key: env::var("GRAMMAR_API_KEY").unwrap_or_default(),
        }
    }
}
