pub mod database;
pub mod oauth;
pub mod server;
pub mod translation;

use database::DatabaseConfig;
use oauth::OAuthConfig;
use server::ServerConfig;
use translation::TranslationConfig;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub translation: TranslationConfig,
    pub oauth: OAuthConfig,
    pub server: ServerConfig,
    pub database: DatabaseConfig,
}

impl AppConfig {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            translation: TranslationConfig::from_env(),
            oauth: OAuthConfig::from_env(),
            server: ServerConfig::from_env(),
            database: DatabaseConfig::from_env(),
        }
    }
}
