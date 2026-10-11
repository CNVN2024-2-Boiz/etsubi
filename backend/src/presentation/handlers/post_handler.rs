use actix_web::{
    Error, HttpResponse, delete, error::ErrorInternalServerError, get, patch, post, web,
};

use crate::{
    bootstrap::state::AppState,
    infrastructure::security::extractor::CurrentUser,
    presentation::dto::post_dto::{
        CreatePostRequest, PostResponse, UpdatePostRequest, UpdatePostStatusRequest,
    },
};

#[utoipa::path(
    post,
    path = "/api/v1/posts",
    tag = "post",
    request_body = CreatePostRequest,
    responses(
        (status = 201, description = "Tạo bài viết thành công", body = PostResponse),
        (status = 400, description = "Dữ liệu không hợp lệ"),
        (status = 401, description = "Chưa đăng nhập"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/posts")]
pub async fn create_post(
    state: web::Data<AppState>,
    user: CurrentUser,
    body: web::Json<CreatePostRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let req = body.into_inner();
    let author_id = user.id;
    let status = req.status.unwrap_or_else(|| "draft".to_string());

    let created =
        web::block(move || service.create(author_id, &req.title, req.content.as_deref(), &status))
            .await
            .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Created().json(PostResponse::from(created)))
}

#[utoipa::path(
    get,
    path = "/api/v1/posts/{id}",
    tag = "post",
    params(
        ("id" = i64, Path, description = "ID bài viết")
    ),
    responses(
        (status = 200, description = "Thông tin bài viết", body = PostResponse),
        (status = 404, description = "Không tìm thấy bài viết"),
    ),
)]
#[get("/posts/{id}")]
pub async fn get_post(
    state: web::Data<AppState>,
    path: web::Path<i64>,
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
    path = "/api/v1/my/posts/{id}",
    tag = "post",
    params(
        ("id" = i64, Path, description = "ID bài viết")
    ),
    responses(
        (status = 200, description = "Bài viết của tôi", body = PostResponse),
        (status = 401, description = "Chưa đăng nhập"),
        (status = 404, description = "Không tìm thấy bài viết"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/posts/{id}")]
pub async fn get_my_post(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<i64>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();
    let author_id = user.id;

    let post = web::block(move || service.get_owned(post_id, author_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(PostResponse::from(post)))
}

#[utoipa::path(
    get,
    path = "/api/v1/my/posts",
    tag = "post",
    responses(
        (status = 200, description = "Danh sách bài viết của tôi", body = [PostResponse]),
        (status = 401, description = "Chưa đăng nhập"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/posts")]
pub async fn list_my_posts(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let author_id = user.id;

    let posts = web::block(move || service.list_my_posts(author_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<PostResponse> = posts.into_iter().map(PostResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/api/v1/users/{id}/posts",
    tag = "post",
    params(
        ("id" = i64, Path, description = "ID tác giả")
    ),
    responses(
        (status = 200, description = "Bài viết đã publish của user", body = [PostResponse]),
    ),
)]
#[get("/users/{id}/posts")]
pub async fn list_user_posts(
    state: web::Data<AppState>,
    path: web::Path<i64>,
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
        ("id" = i64, Path, description = "ID bài viết cần cập nhật")
    ),
    request_body = UpdatePostRequest,
    responses(
        (status = 200, description = "Cập nhật thành công", body = PostResponse),
        (status = 400, description = "Dữ liệu không hợp lệ"),
        (status = 403, description = "Không có quyền sửa"),
        (status = 404, description = "Không tìm thấy bài viết"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/posts/{id}")]
pub async fn update_post(
    state: web::Data<AppState>,
    user: CurrentUser,
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
    .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(PostResponse::from(updated)))
}

#[utoipa::path(
    patch,
    path = "/api/v1/posts/{id}/status",
    tag = "post",
    params(
        ("id" = i64, Path, description = "ID bài viết cần đổi status")
    ),
    request_body = UpdatePostStatusRequest,
    responses(
        (status = 200, description = "Đổi status thành công", body = PostResponse),
        (status = 400, description = "Status không hợp lệ"),
        (status = 403, description = "Không có quyền"),
        (status = 404, description = "Không tìm thấy bài viết"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/posts/{id}/status")]
pub async fn update_post_status(
    state: web::Data<AppState>,
    user: CurrentUser,
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
            .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(PostResponse::from(updated)))
}

#[utoipa::path(
    delete,
    path = "/api/v1/posts/{id}",
    tag = "post",
    params(
        ("id" = i64, Path, description = "ID bài viết cần xóa")
    ),
    responses(
        (status = 204, description = "Xóa thành công"),
        (status = 403, description = "Không có quyền"),
        (status = 404, description = "Không tìm thấy bài viết"),
    ),
    security(("bearer_auth" = [])),
)]
#[delete("/posts/{id}")]
pub async fn delete_post(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<i64>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();
    let requester_id = user.id;
    let is_staff = user.is_staff();

    web::block(move || service.delete(post_id, requester_id, is_staff))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}
