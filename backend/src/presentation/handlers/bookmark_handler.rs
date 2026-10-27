use actix_web::{Error, HttpResponse, delete, error::ErrorInternalServerError, post, web};
use uuid::Uuid;

use crate::{bootstrap::state::AppState, presentation::dto::auth_dto::CurrentUser};

#[utoipa::path(
    post,
    path = "/api/v1/posts/{post_id}/bookmark",
    tag = "bookmark",
    params(("post_id" = Uuid, Path, description = "Post ID")),
    responses(
        (status = 204, description = "Bookmarked"),
        (status = 404, description = "Post not available"),
        (status = 409, description = "Already bookmarked"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/posts/{post_id}/bookmark")]
pub async fn add_bookmark(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.bookmark_service.clone();
    let post_id = path.into_inner();
    let user_id = user.id;

    web::block(move || service.add(user_id, post_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}

#[utoipa::path(
    delete,
    path = "/api/v1/posts/{post_id}/bookmark",
    tag = "bookmark",
    params(("post_id" = Uuid, Path, description = "Post ID")),
    responses(
        (status = 204, description = "Bookmark removed"),
        (status = 404, description = "Bookmark not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[delete("/posts/{post_id}/bookmark")]
pub async fn remove_bookmark(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.bookmark_service.clone();
    let post_id = path.into_inner();
    let user_id = user.id;

    web::block(move || service.remove(user_id, post_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}
