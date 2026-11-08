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
        post::service::PostService, reaction::service::ReactionService, tag::service::TagService,
        translation::service::TranslationService, user::service::UserService,
    },
    infrastructure::{
        database::repositories::{
            auth_repo::PostgresAuthRepo, bookmark_repo::PostgresBookmarkRepo,
            comment_repo::PostgresCommentRepo, follow_repo::PostgresFollowRepo,
            post_repo::PostgresPostRepo, reaction_repo::PostgresReactionRepo,
            tag_repo::PostgresTagRepo, translation_repo::PostgresTranslationRepo,
            user_repo::PostgresUserRepo,
        },
        helper::translation::build_client,
    },
};

pub fn run() -> Result<web::Data<AppState>, Box<dyn std::error::Error>> {
    let config = Arc::new(AppConfig::from_env());
    let db_pool = pool::init(&config.database_url);

    let user_repo = Arc::new(PostgresUserRepo::new(db_pool.clone()));
    let auth_repo = Arc::new(PostgresAuthRepo::new(db_pool.clone()));
    let post_repo = Arc::new(PostgresPostRepo::new(db_pool.clone()));
    let tag_repo = Arc::new(PostgresTagRepo::new(db_pool.clone()));
    let comment_repo = Arc::new(PostgresCommentRepo::new(db_pool.clone()));
    let translation_repo = Arc::new(PostgresTranslationRepo::new(db_pool.clone()));
    let bookmark_repo = Arc::new(PostgresBookmarkRepo::new(db_pool.clone()));
    let reaction_repo = Arc::new(PostgresReactionRepo::new(db_pool.clone()));
    let follow_repo = Arc::new(PostgresFollowRepo::new(db_pool.clone()));

    let user_service = Arc::new(UserService::new(user_repo.clone()));
    let auth_service = Arc::new(AuthService::new(
        auth_repo,
        user_repo.clone(),
        config.jwt_key.clone(),
        config.jwt_expiry_hours,
    ));
    let post_service = Arc::new(PostService::new(post_repo.clone(), user_repo.clone()));
    let comment_service = Arc::new(CommentService::new(
        comment_repo.clone(),
        post_repo.clone(),
        user_repo.clone(),
    ));
    let translation_client = build_client(&config.translation)?;
    let translation_service = Arc::new(TranslationService::new(
        user_repo.clone(),
        post_repo.clone(),
        comment_repo.clone(),
        translation_repo,
        translation_client,
    ));
    let tag_service = Arc::new(TagService::new(tag_repo, post_repo.clone()));
    let bookmark_service = Arc::new(BookmarkService::new(bookmark_repo, post_repo.clone()));
    let reaction_service = Arc::new(ReactionService::new(reaction_repo, post_repo.clone()));
    let follow_service = Arc::new(FollowService::new(follow_repo, user_repo.clone()));

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
        reaction_service,
        translation_service,
    }))
}
