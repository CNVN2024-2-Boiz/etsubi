use std::sync::Arc;

use crate::{
    bootstrap::{config::AppConfig, pool::DbPool},
    domains::{
        auth::service::AuthService, bookmark::service::BookmarkService,
        comment::service::CommentService, follow::service::FollowService,
        language::service::LanguageService, post::service::PostService, tag::service::TagService,
        user::service::UserService,
    },
};

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub pool: DbPool,
    pub auth_service: Arc<AuthService>,
    pub user_service: Arc<UserService>,
    pub post_service: Arc<PostService>,
    pub comment_service: Arc<CommentService>,
    pub tag_service: Arc<TagService>,
    pub bookmark_service: Arc<BookmarkService>,
    pub follow_service: Arc<FollowService>,
    pub language_service: Arc<LanguageService>,
}
