pub mod config;
pub mod pool;
pub mod state;

use actix_web::web;
use std::sync::Arc;

use crate::{
    bootstrap::{config::AppConfig, state::AppState},
    domains::{
        comment::service::CommentService, post::service::PostService, user::service::UserService,
    },
    infrastructure::database::repositories::{
        comment_repo::PostgresCommentRepo, post_repo::PostgresPostRepo, user_repo::PostgresUserRepo,
    },
};

pub fn run() -> Result<web::Data<AppState>, Box<dyn std::error::Error>> {
    let config = Arc::new(AppConfig::from_env());

    let db_pool = pool::init(&config.database_url);

    let user_repo = Arc::new(PostgresUserRepo::new(db_pool.clone()));
    let user_service = Arc::new(UserService::new(user_repo));

    let post_repo = Arc::new(PostgresPostRepo::new(db_pool.clone()));
    let post_service = Arc::new(PostService::new(post_repo.clone()));

    let comment_repo = Arc::new(PostgresCommentRepo::new(db_pool.clone()));
    let comment_service = Arc::new(CommentService::new(comment_repo, post_repo));

    Ok(web::Data::new(AppState {
        config,
        pool: db_pool,
        user_service,
        post_service,
        comment_service,
    }))
}
