use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, post, web};

use crate::{
    bootstrap::state::AppState,
    domains::user::error::UserError,
    infrastructure::security::jwt::{PURPOSE_ACCESS, PURPOSE_VERIFY, create_token},
    presentation::dto::auth_dto::{
        LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, ResendVerificationRequest,
        ResendVerificationResponse, VerifyEmailRequest, VerifyEmailResponse,
    },
};

#[utoipa::path(
    post,
    path = "/api/v1/auth/register",
    tag = "auth",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "Registration successful", body = RegisterResponse),
        (status = 400, description = "Invalid payload"),
        (status = 409, description = "Email or username already taken"),
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

    match create_token(
        user.id,
        String::new(),
        PURPOSE_VERIFY,
        &state.config.jwt_key,
        24,
    ) {
        Ok(token) => {
            if let Err(e) = state
                .email_service
                .send_verification(&user.email, &token)
                .await
            {
                tracing::error!(
                    user_id = %user.id,
                    error = %e,
                    "Failed to send verification email — user can resend later"
                );
            }
        }
        Err(e) => {
            tracing::error!(
                user_id = %user.id,
                error = %e,
                "Failed to create verify token"
            );
        }
    }

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
        (status = 403, description = "Account not verified or banned"),
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
        PURPOSE_ACCESS,
        &state.config.jwt_key,
        state.config.jwt_expiry_hours,
    )
    .map_err(|_| UserError::Internal(anyhow::anyhow!("jwt creation failed")))?;

    Ok(HttpResponse::Ok().json(LoginResponse {
        user_id: user.id,
        token,
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/verify-email",
    tag = "auth",
    request_body = VerifyEmailRequest,
    responses(
        (status = 200, description = "Email verified", body = VerifyEmailResponse),
        (status = 400, description = "Invalid or expired token"),
        (status = 409, description = "Email already verified"),
    ),
)]
#[post("/auth/verify-email")]
pub async fn verify_email(
    state: web::Data<AppState>,
    body: web::Json<VerifyEmailRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let token = body.into_inner().token;
    let jwt_key = state.config.jwt_key.clone();

    let user_id = web::block(move || service.verify_email(&token, &jwt_key))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(VerifyEmailResponse { user_id }))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/resend-verification",
    tag = "auth",
    request_body = ResendVerificationRequest,
    responses(
        (status = 200, description = "Verification email sent if applicable", body = ResendVerificationResponse),
        (status = 429, description = "Too many requests"),
    ),
)]
#[post("/auth/resend-verification")]
pub async fn resend_verification(
    state: web::Data<AppState>,
    body: web::Json<ResendVerificationRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let email = body.into_inner().email;
    let jwt_key = state.config.jwt_key.clone();

    let result = web::block(move || service.resend_verification(&email, &jwt_key))
        .await
        .map_err(ErrorInternalServerError)??;

    if let Some((to, token)) = result
        && let Err(e) = state.email_service.send_verification(&to, &token).await
    {
        tracing::error!(error = %e, "Failed to resend verification email");
    }

    Ok(HttpResponse::Ok().json(ResendVerificationResponse {
        message: "If the account exists and is pending, a verification email has been sent".into(),
    }))
}
