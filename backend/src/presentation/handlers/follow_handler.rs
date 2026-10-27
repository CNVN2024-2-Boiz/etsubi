use actix_web::{Error, HttpResponse, delete, error::ErrorInternalServerError, get, post, web};
use uuid::Uuid;

use crate::{
    bootstrap::state::AppState,
    presentation::dto::{auth_dto::AuthUser, follow_dto::FollowUserResponse},
};

#[utoipa::path(
    post,
    path = "/api/v1/users/{id}/follow",
    tag = "follow",
    params(("id" = Uuid, Path, description = "User to follow")),
    responses(
        (status = 204, description = "Followed"),
        (status = 400, description = "Cannot follow yourself"),
        (status = 404, description = "User not found"),
        (status = 409, description = "Already following"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/users/{id}/follow")]
pub async fn follow_user(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let target_id = path.into_inner();
    let requester_id = user.id;
    let service = state.follow_service.clone();

    web::block(move || service.follow(requester_id, target_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}

#[utoipa::path(
    delete,
    path = "/api/v1/users/{id}/follow",
    tag = "follow",
    params(("id" = Uuid, Path, description = "User to unfollow")),
    responses(
        (status = 204, description = "Unfollowed"),
        (status = 409, description = "Not following"),
    ),
    security(("bearer_auth" = [])),
)]
#[delete("/users/{id}/follow")]
pub async fn unfollow_user(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let target_id = path.into_inner();
    let requester_id = user.id;
    let service = state.follow_service.clone();

    web::block(move || service.unfollow(requester_id, target_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}

#[utoipa::path(
    get,
    path = "/api/v1/users/{id}/followers",
    tag = "follow",
    params(("id" = Uuid, Path, description = "User ID")),
    responses(
        (status = 200, description = "Followers", body = [FollowUserResponse]),
        (status = 404, description = "User not found"),
    ),
)]
#[get("/users/{id}/followers")]
pub async fn list_user_followers(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let target_id = path.into_inner();
    let service = state.follow_service.clone();

    let users = web::block(move || service.list_followers(target_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<FollowUserResponse> = users.into_iter().map(FollowUserResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/api/v1/users/{id}/following",
    tag = "follow",
    params(("id" = Uuid, Path, description = "User ID")),
    responses(
        (status = 200, description = "Following", body = [FollowUserResponse]),
        (status = 404, description = "User not found"),
    ),
)]
#[get("/users/{id}/following")]
pub async fn list_user_following(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let target_id = path.into_inner();
    let service = state.follow_service.clone();

    let users = web::block(move || service.list_following(target_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<FollowUserResponse> = users.into_iter().map(FollowUserResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}
