use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, post, web};

use crate::{
    bootstrap::state::AppState,
    presentation::dto::auth_dto::{
        AuthUser, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse,
    },
};

#[utoipa::path(
    post,
    path = "/api/v1/auth/register",
    tag = "auth",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "Registration successful", body = RegisterResponse),
        (status = 400, description = "Invalid payload (username too short, weak password, invalid language)"),
        (status = 409, description = "Email or username already taken"),
    ),
)]
#[post("/auth/register")]
pub async fn register(
    state: web::Data<AppState>,
    body: web::Json<RegisterRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.auth_service.clone();
    let body = body.into_inner();

    let user = web::block(move || {
        service.register(
            &body.username,
            &body.email,
            &body.native,
            &body.language,
            &body.password,
        )
    })
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
        (status = 200, description = "Login successful", body = LoginResponse),
        (status = 401, description = "Invalid email or password"),
        (status = 403, description = "Account is banned"),
    ),
)]
#[post("/auth/login")]
pub async fn login(
    state: web::Data<AppState>,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.auth_service.clone();
    let body = body.into_inner();

    let (user, token) = web::block(move || service.login(&body.email, &body.password))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(LoginResponse {
        user_id: user.id,
        token,
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/logout",
    tag = "auth",
    responses(
        (status = 204, description = "Logged out; all previously issued tokens are invalidated"),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/auth/logout")]
pub async fn logout(state: web::Data<AppState>, user: AuthUser) -> Result<HttpResponse, Error> {
    let service = state.auth_service.clone();
    let user_id = user.id;

    web::block(move || service.logout(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}
