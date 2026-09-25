use crate::config::AppConfig;
use crate::database::pool::DbPool;

pub struct AppState {
    pub config: AppConfig,
    pub db: DbPool,
}
