use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, post, web};

use crate::{
    bootstrap::state::AppState,
    domains::user::error::UserError,
    infrastructure::security::jwt::create_token,
    presentation::dto::auth_dto::{LoginRequest, LoginResponse, RegisterRequest, RegisterResponse},
};

#[utoipa::path(
    post,
    path = "/api/v1/auth/register",
    tag = "auth",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "Đăng ký thành công", body = RegisterResponse),
        (status = 400, description = "Dữ liệu không hợp lệ"),
        (status = 409, description = "Email hoặc username đã tồn tại"),
    ),
)]
#[post("/auth/register")]
pub async fn register(
    state: web::Data<AppState>,
    body: web::Json<RegisterRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let body = body.into_inner();

    let user = web::block(move || service.create(&body.username, &body.email, &body.password))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Created().json(RegisterResponse { user_id: user.id }))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    tag = "auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Đăng nhập thành công", body = LoginResponse),
        (status = 401, description = "Sai email hoặc mật khẩu"),
    ),
)]
#[post("/auth/login")]
pub async fn login(
    state: web::Data<AppState>,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let body = body.into_inner();

    let user = web::block(move || service.verify_credentials(&body.email, &body.password))
        .await
        .map_err(ErrorInternalServerError)??;

    let token = create_token(
        user.id,
        user.role.clone(),
        &state.config.jwt_key,
        state.config.jwt_expiry_hours,
    )
    .map_err(|_| UserError::Internal(anyhow::anyhow!("jwt creation failed")))?;

    Ok(HttpResponse::Ok().json(LoginResponse {
        user_id: user.id,
        token,
    }))
}
