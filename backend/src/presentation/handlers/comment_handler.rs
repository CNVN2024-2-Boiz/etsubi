use actix_web::{
    Error, HttpResponse, delete, error::ErrorInternalServerError, get, patch, post, web,
};

use uuid::Uuid;

use crate::{
    bootstrap::state::AppState,
    presentation::dto::{
        auth_dto::AuthUser,
        comment_dto::{CommentResponse, CreateCommentRequest, UpdateCommentRequest},
    },
};

#[utoipa::path(
    get,
    path = "/api/v1/posts/{post_id}/comments",
    tag = "comment",
    params(
        ("post_id" = Uuid, Path, description = "Post ID")
    ),
    responses(
        (status = 200, description = "Visible comments of the post", body = [CommentResponse]),
        (status = 404, description = "Post not found"),
    ),
)]
#[get("/posts/{post_id}/comments")]
pub async fn list_post_comments(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.comment_service.clone();
    let post_id = path.into_inner();

    let comments = web::block(move || service.list_visible_by_post(post_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<CommentResponse> = comments.into_iter().map(CommentResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/api/v1/comments/{id}",
    tag = "comment",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    responses(
        (status = 200, description = "Comment details", body = CommentResponse),
        (status = 404, description = "Comment not found"),
    ),
)]
#[get("/comments/{id}")]
pub async fn get_comment(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.comment_service.clone();
    let comment_id = path.into_inner();

    let comment = web::block(move || service.get_visible(comment_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(CommentResponse::from(comment)))
}

#[utoipa::path(
    post,
    path = "/api/v1/posts/{post_id}/comments",
    tag = "comment",
    params(
        ("post_id" = Uuid, Path, description = "Post ID")
    ),
    request_body = CreateCommentRequest,
    responses(
        (status = 201, description = "Comment created", body = CommentResponse),
        (status = 400, description = "Invalid payload"),
        (status = 401, description = "Not authenticated"),
        (status = 403, description = "Post locked or not allowed"),
        (status = 404, description = "Post or parent comment not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/posts/{post_id}/comments")]
pub async fn create_comment(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
    body: web::Json<CreateCommentRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.comment_service.clone();
    let post_id = path.into_inner();
    let req = body.into_inner();
    let requester_id = user.id;

    let created =
        web::block(move || service.create(requester_id, post_id, req.parent_id, &req.content))
            .await
            .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Created().json(CommentResponse::from(created)))
}

#[utoipa::path(
    patch,
    path = "/api/v1/comments/{id}",
    tag = "comment",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    request_body = UpdateCommentRequest,
    responses(
        (status = 200, description = "Comment updated", body = CommentResponse),
        (status = 400, description = "Invalid payload"),
        (status = 403, description = "Not allowed to edit this comment"),
        (status = 404, description = "Comment not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/comments/{id}")]
pub async fn update_comment(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateCommentRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.comment_service.clone();
    let comment_id = path.into_inner();
    let req = body.into_inner();
    let requester_id = user.id;

    let updated =
        web::block(move || service.update_content(comment_id, requester_id, &req.content))
            .await
            .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(CommentResponse::from(updated)))
}

#[utoipa::path(
    delete,
    path = "/api/v1/comments/{id}",
    tag = "comment",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    responses(
        (status = 204, description = "Comment deleted"),
        (status = 403, description = "Not allowed to delete this comment"),
        (status = 404, description = "Comment not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[delete("/comments/{id}")]
pub async fn delete_comment(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.comment_service.clone();
    let comment_id = path.into_inner();
    let requester_id = user.id;
    let requester_role = user.role.clone();

    web::block(move || service.delete(comment_id, requester_id, &requester_role))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}
