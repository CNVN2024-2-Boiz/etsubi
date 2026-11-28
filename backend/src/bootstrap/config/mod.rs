pub mod database;
pub mod mail;
pub mod oauth;
pub mod server;
pub mod translation;

use database::DatabaseConfig;
use mail::MailConfig;
use oauth::OAuthConfig;
use server::ServerConfig;
use translation::TranslationConfig;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub translation: TranslationConfig,
    pub oauth: OAuthConfig,
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub mail: MailConfig,
}

impl AppConfig {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            translation: TranslationConfig::from_env(),
            oauth: OAuthConfig::from_env(),
            server: ServerConfig::from_env(),
            database: DatabaseConfig::from_env(),
            mail: MailConfig::from_env(),
        }
    }
}
