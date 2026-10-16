use std::sync::Arc;

use crate::{
    bootstrap::config::AppConfig,
    bootstrap::pool::DbPool,
    domains::{
        comment::service::CommentService, post::service::PostService, user::service::UserService,
    },
    infrastructure::email::EmailService,
};

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub pool: DbPool,
    pub user_service: Arc<UserService>,
    pub post_service: Arc<PostService>,
    pub comment_service: Arc<CommentService>,
    pub email_service: Arc<dyn EmailService>,
}
