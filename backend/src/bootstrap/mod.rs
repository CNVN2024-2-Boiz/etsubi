pub mod config;
pub mod pool;
pub mod state;

use actix_web::web;
use std::sync::Arc;

use crate::{
    bootstrap::{config::AppConfig, state::AppState},
    domains::{
        auth::service::AuthService, bookmark::service::BookmarkService,
        comment::service::CommentService, follow::service::FollowService,
        language::service::LanguageService, post::service::PostService, tag::service::TagService,
        user::service::UserService,
    },
    infrastructure::database::repositories::{
        bookmark_repo::PostgresBookmarkRepo, comment_repo::PostgresCommentRepo,
        follow_repo::PostgresFollowRepo, language_repo::PostgresLanguageRepo,
        post_repo::PostgresPostRepo, tag_repo::PostgresTagRepo, user_repo::PostgresUserRepo,
    },
};

pub fn run() -> Result<web::Data<AppState>, Box<dyn std::error::Error>> {
    let config = Arc::new(AppConfig::from_env());
    let db_pool = pool::init(&config.database_url);

    let user_repo = Arc::new(PostgresUserRepo::new(db_pool.clone()));
    let user_service = Arc::new(UserService::new(user_repo.clone()));

    let auth_service = Arc::new(AuthService::new(
        user_repo.clone(),
        config.jwt_key.clone(),
        config.jwt_expiry_hours,
    ));

    let post_repo = Arc::new(PostgresPostRepo::new(db_pool.clone()));
    let post_service = Arc::new(PostService::new(post_repo.clone()));

    let comment_repo = Arc::new(PostgresCommentRepo::new(db_pool.clone()));
    let comment_service = Arc::new(CommentService::new(comment_repo, post_repo.clone()));

    let tag_repo = Arc::new(PostgresTagRepo::new(db_pool.clone()));
    let tag_service = Arc::new(TagService::new(tag_repo, post_repo.clone()));

    let bookmark_repo = Arc::new(PostgresBookmarkRepo::new(db_pool.clone()));
    let bookmark_service = Arc::new(BookmarkService::new(bookmark_repo, post_repo));

    let follow_repo = Arc::new(PostgresFollowRepo::new(db_pool.clone()));
    let follow_service = Arc::new(FollowService::new(follow_repo, user_repo));

    let language_repo = Arc::new(PostgresLanguageRepo::new(db_pool.clone()));
    let language_service = Arc::new(LanguageService::new(language_repo));

    Ok(web::Data::new(AppState {
        config,
        pool: db_pool,
        auth_service,
        user_service,
        post_service,
        comment_service,
        tag_service,
        bookmark_service,
        follow_service,
        language_service,
    }))
}
