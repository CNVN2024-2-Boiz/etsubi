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
        // Không có .env thì dùng biến môi trường sẵn có (Docker). Có .env mà đọc lỗi thì cảnh báo:
        // dotenvy dừng ở dòng lỗi, các dòng sau đó không được nạp.
        if let Err(e) = dotenvy::dotenv()
            && !e.not_found()
        {
            tracing::warn!(error = %e, ".env could not be read fully; lines after the error are ignored (quote values with spaces)");
        }

        Self {
            translation: TranslationConfig::from_env(),
            oauth: OAuthConfig::from_env(),
            server: ServerConfig::from_env(),
            database: DatabaseConfig::from_env(),
            mail: MailConfig::from_env(),
        }
    }
}
