use actix_web::{Error, HttpResponse, delete, error::ErrorInternalServerError, get, post, web};
use uuid::Uuid;

use crate::{
    bootstrap::state::AppState,
    presentation::dto::{auth_dto::AuthUser, post_dto::PostResponse, tag_dto::TagResponse},
};

#[utoipa::path(
    get,
    path = "/api/v1/tags",
    tag = "tag",
    responses(
        (status = 200, description = "All tags (fixed set)", body = [TagResponse]),
    ),
)]
#[get("/tags")]
pub async fn list_tags(state: web::Data<AppState>) -> Result<HttpResponse, Error> {
    let service = state.tag_service.clone();
    let tags = web::block(move || service.list_all())
        .await
        .map_err(ErrorInternalServerError)??;
    let resp: Vec<TagResponse> = tags.into_iter().map(TagResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/api/v1/tags/{id}",
    tag = "tag",
    params(("id" = Uuid, Path, description = "Tag ID")),
    responses(
        (status = 200, description = "Tag details", body = TagResponse),
        (status = 404, description = "Tag not found"),
    ),
)]
#[get("/tags/{id}")]
pub async fn get_tag(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.tag_service.clone();
    let tag_id = path.into_inner();
    let tag = web::block(move || service.get(tag_id))
        .await
        .map_err(ErrorInternalServerError)??;
    Ok(HttpResponse::Ok().json(TagResponse::from(tag)))
}

#[utoipa::path(
    get,
    path = "/api/v1/tags/{id}/posts",
    tag = "tag",
    params(("id" = Uuid, Path, description = "Tag ID")),
    responses(
        (status = 200, description = "Published posts with this tag", body = [PostResponse]),
        (status = 404, description = "Tag not found"),
    ),
)]
#[get("/tags/{id}/posts")]
pub async fn list_tag_posts(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.tag_service.clone();
    let tag_id = path.into_inner();
    let posts = web::block(move || service.list_published_posts(tag_id))
        .await
        .map_err(ErrorInternalServerError)??;
    let resp: Vec<PostResponse> = posts.into_iter().map(PostResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/api/v1/posts/{post_id}/tags",
    tag = "tag",
    params(("post_id" = Uuid, Path, description = "Post ID")),
    responses(
        (status = 200, description = "Tags of the post", body = [TagResponse]),
        (status = 404, description = "Post not found"),
    ),
)]
#[get("/posts/{post_id}/tags")]
pub async fn list_post_tags(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.tag_service.clone();
    let post_id = path.into_inner();
    let tags = web::block(move || service.list_by_post(post_id))
        .await
        .map_err(ErrorInternalServerError)??;
    let resp: Vec<TagResponse> = tags.into_iter().map(TagResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    post,
    path = "/api/v1/posts/{post_id}/tags/{tag_id}",
    tag = "tag",
    params(
        ("post_id" = Uuid, Path, description = "Post ID"),
        ("tag_id" = Uuid, Path, description = "Tag ID"),
    ),
    responses(
        (status = 204, description = "Tag attached"),
        (status = 403, description = "Not the post owner"),
        (status = 404, description = "Post or tag not found"),
        (status = 409, description = "Tag already attached"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/posts/{post_id}/tags/{tag_id}")]
pub async fn attach_tag(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<(Uuid, Uuid)>,
) -> Result<HttpResponse, Error> {
    let (post_id, tag_id) = path.into_inner();
    let requester_id = user.id;
    let service = state.tag_service.clone();

    web::block(move || service.attach(post_id, tag_id, requester_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}

#[utoipa::path(
    delete,
    path = "/api/v1/posts/{post_id}/tags/{tag_id}",
    tag = "tag",
    params(
        ("post_id" = Uuid, Path, description = "Post ID"),
        ("tag_id" = Uuid, Path, description = "Tag ID"),
    ),
    responses(
        (status = 204, description = "Tag detached"),
        (status = 403, description = "Not the post owner"),
        (status = 404, description = "Post not found"),
        (status = 409, description = "Tag not attached"),
    ),
    security(("bearer_auth" = [])),
)]
#[delete("/posts/{post_id}/tags/{tag_id}")]
pub async fn detach_tag(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<(Uuid, Uuid)>,
) -> Result<HttpResponse, Error> {
    let (post_id, tag_id) = path.into_inner();
    let requester_id = user.id;
    let service = state.tag_service.clone();

    web::block(move || service.detach(post_id, tag_id, requester_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}
