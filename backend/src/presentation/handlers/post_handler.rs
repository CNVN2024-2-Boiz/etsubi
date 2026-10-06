use actix_web::{
    Error, HttpResponse, delete,
    error::{ErrorBadRequest, ErrorForbidden, ErrorInternalServerError, ErrorNotFound},
    get, patch, post, web,
};

use crate::{
    bootstrap::state::AppState,
    infrastructure::security::extractor::AuthUser,
    presentation::dto::post_dto::{
        CreatePostRequest, PostResponse, UpdatePostRequest, UpdatePostStatusRequest,
    },
};

#[post("/posts")]
pub async fn create_post(
    state: web::Data<AppState>,
    user: AuthUser,
    body: web::Json<CreatePostRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let req = body.into_inner();
    let author_id = user.id;
    let status = req.status.unwrap_or_else(|| "draft".to_string());

    let created =
        web::block(move || service.create(author_id, &req.title, req.content.as_deref(), &status))
            .await
            .map_err(ErrorInternalServerError)?
            .map_err(|e| ErrorBadRequest(e.to_string()))?;

    Ok(HttpResponse::Created().json(PostResponse::from(created)))
}

#[get("/posts/{id}")]
pub async fn get_post(
    state: web::Data<AppState>,
    path: web::Path<i64>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();

    let post = web::block(move || service.get_published(post_id))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|_| ErrorNotFound("Post not found"))?;

    Ok(HttpResponse::Ok().json(PostResponse::from(post)))
}

#[get("/my/posts/{id}")]
pub async fn get_my_post(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<i64>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();
    let author_id = user.id;

    let post = web::block(move || service.get_owned(post_id, author_id))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|_| ErrorNotFound("Post not found"))?;

    Ok(HttpResponse::Ok().json(PostResponse::from(post)))
}

#[get("/my/posts")]
pub async fn list_my_posts(
    state: web::Data<AppState>,
    user: AuthUser,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let author_id = user.id;

    let posts = web::block(move || service.list_my_posts(author_id))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(ErrorInternalServerError)?;

    let resp: Vec<PostResponse> = posts.into_iter().map(PostResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[get("/users/{id}/posts")]
pub async fn list_user_posts(
    state: web::Data<AppState>,
    path: web::Path<i64>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let author_id = path.into_inner();

    let posts = web::block(move || service.list_published_by_author(author_id))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(ErrorInternalServerError)?;

    let resp: Vec<PostResponse> = posts.into_iter().map(PostResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[patch("/posts/{id}")]
pub async fn update_post(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<i64>,
    body: web::Json<UpdatePostRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();
    let req = body.into_inner();
    let requester_id = user.id;

    let updated = web::block(move || {
        service.update_content(post_id, requester_id, &req.title, req.content.as_deref())
    })
    .await
    .map_err(ErrorInternalServerError)?
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("Not allowed") || msg.contains("hidden") {
            ErrorForbidden(msg)
        } else {
            ErrorBadRequest(msg)
        }
    })?;

    Ok(HttpResponse::Ok().json(PostResponse::from(updated)))
}

#[patch("/posts/{id}/status")]
pub async fn update_post_status(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<i64>,
    body: web::Json<UpdatePostStatusRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();
    let status = body.into_inner().status;
    let requester_id = user.id;
    let is_staff = user.is_staff();

    let updated =
        web::block(move || service.update_status(post_id, requester_id, is_staff, &status))
            .await
            .map_err(ErrorInternalServerError)?
            .map_err(|e| {
                let msg = e.to_string();
                if msg.contains("Not allowed")
                    || msg.contains("Only staff")
                    || msg.contains("hidden")
                {
                    ErrorForbidden(msg)
                } else {
                    ErrorBadRequest(msg)
                }
            })?;

    Ok(HttpResponse::Ok().json(PostResponse::from(updated)))
}

#[delete("/posts/{id}")]
pub async fn delete_post(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<i64>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();
    let requester_id = user.id;
    let is_staff = user.is_staff();

    web::block(move || service.delete(post_id, requester_id, is_staff))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("Not allowed") {
                ErrorForbidden(msg)
            } else {
                ErrorBadRequest(msg)
            }
        })?;

    Ok(HttpResponse::NoContent().finish())
}
