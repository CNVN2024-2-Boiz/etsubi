use actix_web::{
    Error, HttpResponse, delete, error::ErrorInternalServerError, get, patch, post, web,
};

use uuid::Uuid;

use crate::{
    bootstrap::state::AppState,
    presentation::dto::{
        auth_dto::AuthUser,
        post_dto::{CreatePostRequest, PostResponse, SearchPostsQuery, UpdatePostRequest},
    },
};

#[utoipa::path(
    post,
    path = "/api/v1/posts",
    tag = "post",
    request_body = CreatePostRequest,
    responses(
        (status = 201, description = "Post created", body = PostResponse),
        (status = 400, description = "Invalid payload"),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/posts")]
pub async fn create_post(
    state: web::Data<AppState>,
    user: AuthUser,
    body: web::Json<CreatePostRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let req = body.into_inner();
    let author_id = user.id;

    let created = web::block(move || {
        service.create(
            author_id,
            &req.title,
            req.content.as_deref().unwrap_or(""),
            req.latitude,
            req.longitude,
        )
    })
    .await
    .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Created().json(PostResponse::from(created)))
}

#[utoipa::path(
    get,
    path = "/api/v1/posts/{id}",
    tag = "post",
    params(
        ("id" = Uuid, Path, description = "Post ID")
    ),
    responses(
        (status = 200, description = "Post details", body = PostResponse),
        (status = 404, description = "Post not found"),
    ),
)]
#[get("/posts/{id}")]
pub async fn get_post(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();

    let post = web::block(move || service.get_published(post_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(PostResponse::from(post)))
}

#[utoipa::path(
    get,
    path = "/api/v1/users/{id}/posts",
    tag = "post",
    params(
        ("id" = Uuid, Path, description = "Author ID")
    ),
    responses(
        (status = 200, description = "Published posts by the author", body = [PostResponse]),
    ),
)]
#[get("/users/{id}/posts")]
pub async fn list_user_posts(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let author_id = path.into_inner();

    let posts = web::block(move || service.list_published_by_author(author_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<PostResponse> = posts.into_iter().map(PostResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    patch,
    path = "/api/v1/posts/{id}",
    tag = "post",
    params(
        ("id" = Uuid, Path, description = "ID of the post to update")
    ),
    request_body = UpdatePostRequest,
    responses(
        (status = 200, description = "Post updated", body = PostResponse),
        (status = 400, description = "Invalid payload"),
        (status = 403, description = "Not allowed to edit this post"),
        (status = 404, description = "Post not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/posts/{id}")]
pub async fn update_post(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdatePostRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();
    let req = body.into_inner();
    let requester_id = user.id;

    let updated = web::block(move || {
        service.update_content(
            post_id,
            requester_id,
            &req.title,
            req.content.as_deref().unwrap_or(""),
        )
    })
    .await
    .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(PostResponse::from(updated)))
}

#[utoipa::path(
    delete,
    path = "/api/v1/posts/{id}",
    tag = "post",
    params(
        ("id" = Uuid, Path, description = "ID of the post to delete")
    ),
    responses(
        (status = 204, description = "Post deleted"),
        (status = 403, description = "Not allowed to delete this post"),
        (status = 404, description = "Post not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[delete("/posts/{id}")]
pub async fn delete_post(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();
    let requester_id = user.id;

    web::block(move || service.delete(post_id, requester_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}

#[utoipa::path(
    get,
    path = "/api/v1/posts",
    tag = "post",
    responses((status = 200, body = [PostResponse])),
)]
#[get("/posts")]
pub async fn search_posts(
    state: web::Data<AppState>,
    q: web::Query<SearchPostsQuery>,
) -> Result<HttpResponse, Error> {
    let q = q.into_inner();
    let tags: Vec<Uuid> = q
        .tags
        .as_deref()
        .unwrap_or("")
        .split(',')
        .filter(|s| !s.is_empty())
        .map(Uuid::parse_str)
        .collect::<Result<_, _>>()
        .map_err(|_| actix_web::error::ErrorBadRequest("Invalid tag UUID"))?;
    let service = state.post_service.clone();
    let query = q.q;
    let posts = web::block(move || service.search(query.as_deref(), &tags, q.limit, q.offset))
        .await
        .map_err(ErrorInternalServerError)??;
    Ok(HttpResponse::Ok().json(
        posts
            .into_iter()
            .map(PostResponse::from)
            .collect::<Vec<_>>(),
    ))
}
