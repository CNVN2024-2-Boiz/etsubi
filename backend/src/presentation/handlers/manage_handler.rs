use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, patch, post, web};

use uuid::Uuid;

use crate::{
    bootstrap::state::AppState,
    infrastructure::security::extractor::CurrentUser,
    presentation::dto::{
        post_dto::{PostResponse, UpdatePostStatusRequest},
        user_dto::{UpdateRoleRequest, UpdateStatusRequest, UserResponse},
    },
};

#[utoipa::path(
    patch,
    path = "/api/v1/manage/users/{id}/status",
    tag = "manage",
    params(
        ("id" = Uuid, Path, description = "ID of the user whose status will change")
    ),
    request_body = UpdateStatusRequest,
    responses(
        (status = 200, description = "Status updated", body = UserResponse),
        (status = 400, description = "Invalid status"),
        (status = 403, description = "Requires moderator or admin role"),
        (status = 404, description = "User not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/manage/users/{id}/status")]
pub async fn update_user_status(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateStatusRequest>,
) -> Result<HttpResponse, Error> {
    let target_id = path.into_inner();
    let requester_id = user.id;
    let requester_role = user.role.clone();
    let status = body.into_inner().status;
    let service = state.user_service.clone();

    let updated = web::block(move || {
        service.update_status(target_id, requester_id, &requester_role, &status)
    })
    .await
    .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(UserResponse::from(updated)))
}

#[utoipa::path(
    patch,
    path = "/api/v1/manage/users/{id}/role",
    tag = "manage",
    params(
        ("id" = Uuid, Path, description = "ID of the user whose role will change")
    ),
    request_body = UpdateRoleRequest,
    responses(
        (status = 200, description = "Role updated", body = UserResponse),
        (status = 400, description = "Invalid role"),
        (status = 403, description = "Requires admin role"),
        (status = 404, description = "User not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/manage/users/{id}/role")]
pub async fn update_user_role(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateRoleRequest>,
) -> Result<HttpResponse, Error> {
    let target_id = path.into_inner();
    let requester_id = user.id;
    let requester_role = user.role.clone();
    let role = body.into_inner().role;
    let service = state.user_service.clone();

    let updated =
        web::block(move || service.update_role(target_id, requester_id, &requester_role, &role))
            .await
            .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(UserResponse::from(updated)))
}

#[utoipa::path(
    patch,
    path = "/api/v1/manage/posts/{id}/status",
    tag = "manage",
    params(
        ("id" = Uuid, Path, description = "ID of the post whose status will change")
    ),
    request_body = UpdatePostStatusRequest,
    responses(
        (status = 200, description = "Post status updated", body = PostResponse),
        (status = 400, description = "Invalid status"),
        (status = 403, description = "Requires moderator or admin role"),
        (status = 404, description = "Post not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/manage/posts/{id}/status")]
pub async fn update_post_status(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdatePostStatusRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();
    let requester_role = user.role.clone();
    let status = body.into_inner().status;

    let updated = web::block(move || service.update_status(post_id, &requester_role, &status))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(PostResponse::from(updated)))
}

#[utoipa::path(
    post,
    path = "/api/v1/manage/posts/{id}/restore",
    tag = "manage",
    params(
        ("id" = Uuid, Path, description = "ID of the post to restore")
    ),
    responses(
        (status = 200, description = "Post restored", body = PostResponse),
        (status = 403, description = "Requires moderator or admin role"),
        (status = 404, description = "Post not found or not deleted"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/manage/posts/{id}/restore")]
pub async fn restore_post(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let post_id = path.into_inner();
    let requester_role = user.role.clone();
    let service = state.post_service.clone();

    let post = web::block(move || service.restore(post_id, &requester_role))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(PostResponse::from(post)))
}
