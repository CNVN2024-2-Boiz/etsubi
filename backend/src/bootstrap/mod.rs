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
        notification::service::NotificationService, post::service::PostService,
        reaction::service::ReactionService, report::service::ReportService,
        tag::service::TagService,
        translation::service::TranslationService, user::service::UserService,
    },
    infrastructure::{
        database::repositories::{
            auth_repo::PostgresAuthRepo, bookmark_repo::PostgresBookmarkRepo,
            comment_repo::PostgresCommentRepo, follow_repo::PostgresFollowRepo,
            notification_repo::PostgresNotificationRepo, post_repo::PostgresPostRepo,
            reaction_repo::PostgresReactionRepo, tag_repo::PostgresTagRepo,
            translation_repo::PostgresTranslationRepo, user_repo::PostgresUserRepo,
        },
        helper::{mail::build_mailer, translation::build_client},
    },
};

pub fn run() -> Result<web::Data<AppState>, Box<dyn std::error::Error>> {
    let config = Arc::new(AppConfig::from_env());
    let database = &config.database;
    let server = &config.server;
    let pool = pool::init(&database.url);

    let user_repo = Arc::new(PostgresUserRepo::new(pool.clone()));
    let auth_repo = Arc::new(PostgresAuthRepo::new(pool.clone()));
    let post_repo = Arc::new(PostgresPostRepo::new(pool.clone()));
    let tag_repo = Arc::new(PostgresTagRepo::new(pool.clone()));
    let comment_repo = Arc::new(PostgresCommentRepo::new(pool.clone()));
    let translation_repo = Arc::new(PostgresTranslationRepo::new(pool.clone()));
    let bookmark_repo = Arc::new(PostgresBookmarkRepo::new(pool.clone()));
    let reaction_repo = Arc::new(PostgresReactionRepo::new(pool.clone()));
    let follow_repo = Arc::new(PostgresFollowRepo::new(pool.clone()));
    let notification_repo = Arc::new(PostgresNotificationRepo::new(pool.clone()));

    // Một mailer dùng chung cho mail tài khoản và mail báo cáo vi phạm.
    let mailer = build_mailer(&config.mail);

    let user_service = Arc::new(UserService::new(user_repo.clone()));
    let auth_service = Arc::new(AuthService::new(
        auth_repo,
        user_repo.clone(),
        server.jwt_key.clone(),
        server.jwt_expiry_hours,
        mailer.clone(),
        config.mail.app_base_url.clone(),
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

    let notification_service = Arc::new(NotificationService::new(
        notification_repo,
        user_repo.clone(),
        post_repo.clone(),
        follow_repo.clone(),
    ));

    let tag_service = Arc::new(TagService::new(tag_repo, post_repo.clone()));
    let bookmark_service = Arc::new(BookmarkService::new(bookmark_repo, post_repo.clone()));
    let reaction_service = Arc::new(ReactionService::new(reaction_repo, post_repo.clone()));
    let follow_service = Arc::new(FollowService::new(follow_repo, user_repo.clone()));
    let report_service = Arc::new(ReportService::new(
        user_repo.clone(),
        post_repo.clone(),
        comment_repo.clone(),
        mailer,
        config.mail.app_base_url.clone(),
        config.mail.report_to.clone(),
    ));

    Ok(web::Data::new(AppState {
        config,
        pool,
        auth_service,
        user_service,
        post_service,
        comment_service,
        tag_service,
        bookmark_service,
        follow_service,
        reaction_service,
        notification_service,
        translation_service,
        report_service,
    }))
}
