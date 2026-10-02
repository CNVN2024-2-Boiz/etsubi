use crate::{bootstrap::config::AppConfig, bootstrap::pool, bootstrap::pool::DbPool};
use actix_web::web;
use std::sync::Arc;

pub struct AppState {
    pub config: Arc<AppConfig>,
    pub pool: DbPool,
}

impl AppState {
    pub fn run() -> Result<web::Data<AppState>, Box<dyn std::error::Error>> {
        let config = Arc::new(AppConfig::from_env());
        let db_pool = pool::init(&config.database_url);

        Ok(web::Data::new(AppState {
            config,
            pool: db_pool,
        }))
    }
}
