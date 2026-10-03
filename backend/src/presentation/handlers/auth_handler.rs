use actix_web::{
    Error, HttpResponse,
    error::{ErrorBadRequest, ErrorInternalServerError, ErrorUnauthorized},
    post, web,
};

use crate::{
    bootstrap::state::AppState,
    infrastructure::security::jwt::create_token,
    presentation::dto::auth_dto::{LoginRequest, LoginResponse, RegisterRequest, RegisterResponse},
};

#[post("/auth/register")]
pub async fn register(
    state: web::Data<AppState>,
    body: web::Json<RegisterRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let body = body.into_inner();

    let user = web::block(move || service.create(&body.username, &body.email, &body.password))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|e| ErrorBadRequest(e.to_string()))?;

    Ok(HttpResponse::Created().json(RegisterResponse { user_id: user.id }))
}

#[post("/auth/login")]
pub async fn login(
    state: web::Data<AppState>,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let body = body.into_inner();

    let user = web::block(move || service.verify_credentials(&body.email, &body.password))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|_| ErrorUnauthorized("Invalid credentials"))?;

    let token = create_token(
        user.id,
        vec!["user".to_string()],
        &state.config.jwt_key,
        state.config.jwt_expiry_hours,
    )
    .map_err(ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(LoginResponse {
        user_id: user.id,
        token,
    }))
}
