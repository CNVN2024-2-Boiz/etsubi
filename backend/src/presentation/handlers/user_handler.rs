use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, get, patch, web};

use crate::{
    bootstrap::state::AppState,
    domains::user::error::UserError,
    infrastructure::security::extractor::CurrentUser,
    presentation::dto::user_dto::{
        UpdateProfileRequest, UpdateRoleRequest, UpdateStatusRequest, UserResponse,
    },
};

#[utoipa::path(
    get,
    path = "/api/v1/my",
    tag = "user",
    responses(
        (status = 200, description = "Thông tin cá nhân", body = UserResponse),
        (status = 401, description = "Chưa đăng nhập"),
        (status = 404, description = "Không tìm thấy user"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my")]
pub async fn get_personal_info(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let user_id = user.id;

    let me = web::block(move || service.get(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(UserResponse::from(me)))
}

#[utoipa::path(
    get,
    path = "/api/v1/users/{id}",
    tag = "user",
    params(
        ("id" = i64, Path, description = "ID người dùng")
    ),
    responses(
        (status = 200, description = "Thông tin người dùng", body = UserResponse),
        (status = 404, description = "Không tìm thấy user"),
    ),
)]
#[get("/users/{id}")]
pub async fn get_user(
    state: web::Data<AppState>,
    path: web::Path<i64>,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let user_id = path.into_inner();

    let user = web::block(move || service.get(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(UserResponse::from(user)))
}

#[utoipa::path(
    patch,
    path = "/api/v1/users/{id}",
    tag = "user",
    params(
        ("id" = i64, Path, description = "ID người dùng cần cập nhật")
    ),
    request_body = UpdateProfileRequest,
    responses(
        (status = 200, description = "Cập nhật thành công", body = UserResponse),
        (status = 400, description = "Dữ liệu không hợp lệ"),
        (status = 403, description = "Không có quyền sửa profile này"),
        (status = 404, description = "Không tìm thấy user"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/users/{id}")]
pub async fn update_user(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<i64>,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, Error> {
    let target_id = path.into_inner();
    let requester_id = user.id;
    let requester_is_admin = user.is_admin();
    let req = body.into_inner();

    let service = state.user_service.clone();

    let updated = web::block(move || {
        service.update_profile(target_id, requester_id, requester_is_admin, req)
    })
    .await
    .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(UserResponse::from(updated)))
}

#[utoipa::path(
    patch,
    path = "/api/v1/users/{id}/status",
    tag = "user",
    params(
        ("id" = i64, Path, description = "ID người dùng cần đổi status")
    ),
    request_body = UpdateStatusRequest,
    responses(
        (status = 200, description = "Đổi status thành công", body = UserResponse),
        (status = 400, description = "Status không hợp lệ"),
        (status = 403, description = "Yêu cầu moderator hoặc admin"),
        (status = 404, description = "Không tìm thấy user"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/users/{id}/status")]
pub async fn update_status(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<i64>,
    body: web::Json<UpdateStatusRequest>,
) -> Result<HttpResponse, Error> {
    if !user.is_staff() {
        return Err(UserError::RequiresStaff.into());
    }

    let target_id = path.into_inner();
    let requester_id = user.id;
    let requester_is_admin = user.is_admin();
    let status = body.into_inner().status;
    let service = state.user_service.clone();

    let updated = web::block(move || {
        service.update_status(target_id, requester_id, requester_is_admin, &status)
    })
    .await
    .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(UserResponse::from(updated)))
}

#[utoipa::path(
    patch,
    path = "/api/v1/users/{id}/role",
    tag = "user",
    params(
        ("id" = i64, Path, description = "ID người dùng cần đổi role")
    ),
    request_body = UpdateRoleRequest,
    responses(
        (status = 200, description = "Đổi role thành công", body = UserResponse),
        (status = 400, description = "Role không hợp lệ"),
        (status = 403, description = "Yêu cầu admin"),
        (status = 404, description = "Không tìm thấy user"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/users/{id}/role")]
pub async fn update_role(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<i64>,
    body: web::Json<UpdateRoleRequest>,
) -> Result<HttpResponse, Error> {
    if !user.is_admin() {
        return Err(UserError::RequiresAdmin.into());
    }

    let target_id = path.into_inner();
    let requester_id = user.id;
    let role = body.into_inner().role;
    let service = state.user_service.clone();

    let updated = web::block(move || service.update_role(target_id, requester_id, &role))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(UserResponse::from(updated)))
}
