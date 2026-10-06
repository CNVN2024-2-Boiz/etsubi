use std::sync::Arc;

use crate::{
    bootstrap::config::AppConfig,
    bootstrap::pool::DbPool,
    domains::{post::service::PostService, user::service::UserService},
};

pub struct AppState {
    pub config: Arc<AppConfig>,
    pub pool: DbPool,
    pub user_service: Arc<UserService>,
    pub post_service: Arc<PostService>,
}
