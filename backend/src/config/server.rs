use std::env;

#[derive(Clone, Debug)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

impl ServerConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: env::var("SERVER_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(8080),
        }
    }
}
