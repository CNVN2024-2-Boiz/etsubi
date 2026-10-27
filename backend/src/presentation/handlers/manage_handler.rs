use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, get, patch, post, web};

use uuid::Uuid;

use crate::{
    bootstrap::state::AppState,
    presentation::dto::{
        auth_dto::CurrentUser,
        comment_dto::{CommentResponse, UpdateCommentStatusRequest},
        post_dto::{PostResponse, UpdatePostStatusRequest},
        user_dto::{GetUserResponse, UpdateRoleRequest, UpdateStatusRequest},
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
        (status = 200, description = "Status updated", body = GetUserResponse),
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

    Ok(HttpResponse::Ok().json(GetUserResponse::from(updated)))
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
        (status = 200, description = "Role updated", body = GetUserResponse),
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

    Ok(HttpResponse::Ok().json(GetUserResponse::from(updated)))
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

#[utoipa::path(
    get,
    path = "/api/v1/manage/posts/{post_id}/comments",
    tag = "manage",
    params(
        ("post_id" = Uuid, Path, description = "Post ID")
    ),
    responses(
        (status = 200, description = "All comments of the post (including hidden/deleted)", body = [CommentResponse]),
        (status = 403, description = "Requires moderator or admin role"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/manage/posts/{post_id}/comments")]
pub async fn list_post_comments_manage(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.comment_service.clone();
    let post_id = path.into_inner();
    let requester_role = user.role.clone();

    let comments = web::block(move || service.list_all_by_post(post_id, &requester_role))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<CommentResponse> = comments.into_iter().map(CommentResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/api/v1/manage/comments/{id}",
    tag = "manage",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    responses(
        (status = 200, description = "Comment details (including deleted)", body = CommentResponse),
        (status = 403, description = "Requires moderator or admin role"),
        (status = 404, description = "Comment not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/manage/comments/{id}")]
pub async fn get_comment_manage(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.comment_service.clone();
    let comment_id = path.into_inner();
    let requester_role = user.role.clone();

    let comment = web::block(move || service.get_any(comment_id, &requester_role))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(CommentResponse::from(comment)))
}

#[utoipa::path(
    patch,
    path = "/api/v1/manage/comments/{id}/status",
    tag = "manage",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    request_body = UpdateCommentStatusRequest,
    responses(
        (status = 200, description = "Comment status updated", body = CommentResponse),
        (status = 400, description = "Invalid status"),
        (status = 403, description = "Requires moderator or admin role"),
        (status = 404, description = "Comment not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/manage/comments/{id}/status")]
pub async fn update_comment_status(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateCommentStatusRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.comment_service.clone();
    let comment_id = path.into_inner();
    let requester_role = user.role.clone();
    let status = body.into_inner().status;

    let updated = web::block(move || service.update_status(comment_id, &requester_role, &status))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(CommentResponse::from(updated)))
}

#[utoipa::path(
    post,
    path = "/api/v1/manage/comments/{id}/restore",
    tag = "manage",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    responses(
        (status = 200, description = "Comment restored", body = CommentResponse),
        (status = 403, description = "Requires moderator or admin role"),
        (status = 404, description = "Comment not found or not deleted"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/manage/comments/{id}/restore")]
pub async fn restore_comment(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.comment_service.clone();
    let comment_id = path.into_inner();
    let requester_role = user.role.clone();

    let comment = web::block(move || service.restore(comment_id, &requester_role))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(CommentResponse::from(comment)))
}
