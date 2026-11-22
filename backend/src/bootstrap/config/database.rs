use std::env;

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    pub name: String,
    pub user: String,
    pub port: u16,
    pub password: String,
}

impl DatabaseConfig {
    pub fn from_env() -> Self {
        Self {
            url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            name: env::var("DATABASE_NAME").expect("DATABASE_NAME must be set"),
            user: env::var("DATABASE_USER").expect("DATABASE_USER must be set"),
            port: env::var("DATABASE_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(5432),
            password: env::var("DATABASE_PASSWORD").expect("PASSWORD must be set"),
        }
    }
}
