pub mod auth;
pub mod database;
pub mod external;
pub mod server;

use auth::AuthConfig;
use database::DatabaseConfig;
use external::ExternalConfig;
use server::ServerConfig;

pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub auth: AuthConfig,
    pub external: ExternalConfig,
}

impl AppConfig {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            server: ServerConfig::from_env(),
            database: DatabaseConfig::from_env(),
            auth: AuthConfig::from_env(),
            external: ExternalConfig::from_env(),
        }
    }
}
