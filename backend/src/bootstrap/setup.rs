use crate::{config::AppConfig, shared::database::pool::DbPool};
use actix_web::web;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub pool: DbPool,
}

pub fn run() -> Result<web::Data<AppState>, Box<dyn std::error::Error>> {
    let config = Arc::new(AppConfig::from_env());
    let pool = crate::shared::database::pool::init(&config.database.url);

    Ok(web::Data::new(AppState { config, pool }))
}
