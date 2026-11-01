use actix_web::{Error, HttpResponse, post, web};
use uuid::Uuid;

use crate::{
    bootstrap::state::AppState,
    presentation::dto::{
        auth_dto::AuthUser,
        translation_dto::{CommentTranslationResponse, PostTranslationResponse},
    },
};

#[utoipa::path(
    post,
    path = "/api/v1/posts/{id}/translate",
    tag = "translation",
    params(("id" = Uuid, Path, description = "Post ID")),
    responses(
        (status = 200, description = "Translation result", body = PostTranslationResponse),
        (status = 400, description = "Content too long"),
        (status = 401, description = "Not authenticated"),
        (status = 404, description = "Post not found"),
        (status = 503, description = "Translation service not configured / upstream down"),
        (status = 504, description = "Translation upstream timed out"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/posts/{id}/translate")]
pub async fn translate_post(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let post_id = path.into_inner();
    let view = state
        .translation_service
        .translate_post(user.id, post_id)
        .await?;
    Ok(HttpResponse::Ok().json(PostTranslationResponse::from(view)))
}

#[utoipa::path(
    post,
    path = "/api/v1/comments/{id}/translate",
    tag = "translation",
    params(("id" = Uuid, Path, description = "Comment ID")),
    responses(
        (status = 200, description = "Translation result", body = CommentTranslationResponse),
        (status = 400, description = "Content too long"),
        (status = 401, description = "Not authenticated"),
        (status = 404, description = "Comment not found"),
        (status = 503, description = "Translation service not configured / upstream down"),
        (status = 504, description = "Translation upstream timed out"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/comments/{id}/translate")]
pub async fn translate_comment(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let comment_id = path.into_inner();
    let view = state
        .translation_service
        .translate_comment(user.id, comment_id)
        .await?;
    Ok(HttpResponse::Ok().json(CommentTranslationResponse::from(view)))
}
