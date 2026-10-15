use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, post, web};

use crate::{
    bootstrap::state::AppState,
    domains::user::error::UserError,
    infrastructure::security::{extractor::CurrentUser, jwt::create_token},
    presentation::dto::auth_dto::{
        ChangeEmailRequest, ChangeEmailResponse, ConfirmEmailChangeRequest,
        ConfirmEmailChangeResponse, ForgotPasswordRequest, ForgotPasswordResponse, LoginRequest,
        LoginResponse, MagicLinkRequest, MagicLinkResponse, MagicLoginRequest, RegisterRequest,
        RegisterResponse, ResendVerificationResponse, ResetPasswordRequest, ResetPasswordResponse,
        VerifyEmailRequest, VerifyEmailResponse,
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
        String::new(),
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
    ),
)]
#[post("/auth/verify-email")]
pub async fn verify_email(
    _state: web::Data<AppState>,
    _body: web::Json<VerifyEmailRequest>,
) -> Result<HttpResponse, Error> {
    todo!()
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/resend-verification",
    tag = "auth",
    responses(
        (status = 200, description = "Verification email sent", body = ResendVerificationResponse),
        (status = 401, description = "Not authenticated"),
        (status = 429, description = "Too many requests"),
    ),
)]
#[post("/auth/resend-verification")]
pub async fn resend_verification(
    _state: web::Data<AppState>,
    _user: CurrentUser,
) -> Result<HttpResponse, Error> {
    todo!()
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/forgot-password",
    tag = "auth",
    request_body = ForgotPasswordRequest,
    responses(
        (status = 200, description = "Reset email sent if account exists", body = ForgotPasswordResponse),
    ),
)]
#[post("/auth/forgot-password")]
pub async fn forgot_password(
    _state: web::Data<AppState>,
    _body: web::Json<ForgotPasswordRequest>,
) -> Result<HttpResponse, Error> {
    todo!()
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/reset-password",
    tag = "auth",
    request_body = ResetPasswordRequest,
    responses(
        (status = 200, description = "Password reset successful", body = ResetPasswordResponse),
        (status = 400, description = "Invalid or expired token"),
    ),
)]
#[post("/auth/reset-password")]
pub async fn reset_password(
    _state: web::Data<AppState>,
    _body: web::Json<ResetPasswordRequest>,
) -> Result<HttpResponse, Error> {
    todo!()
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/magic-link",
    tag = "auth",
    request_body = MagicLinkRequest,
    responses(
        (status = 200, description = "Magic link sent if account exists", body = MagicLinkResponse),
    ),
)]
#[post("/auth/magic-link")]
pub async fn request_magic_link(
    _state: web::Data<AppState>,
    _body: web::Json<MagicLinkRequest>,
) -> Result<HttpResponse, Error> {
    todo!()
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/magic-login",
    tag = "auth",
    request_body = MagicLoginRequest,
    responses(
        (status = 200, description = "Magic login successful", body = LoginResponse),
        (status = 400, description = "Invalid or expired token"),
    ),
)]
#[post("/auth/magic-login")]
pub async fn magic_login(
    _state: web::Data<AppState>,
    _body: web::Json<MagicLoginRequest>,
) -> Result<HttpResponse, Error> {
    todo!()
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/change-email",
    tag = "auth",
    request_body = ChangeEmailRequest,
    responses(
        (status = 200, description = "Confirmation email sent to new address", body = ChangeEmailResponse),
        (status = 401, description = "Not authenticated"),
        (status = 409, description = "Email already taken"),
    ),
)]
#[post("/auth/change-email")]
pub async fn request_change_email(
    _state: web::Data<AppState>,
    _user: CurrentUser,
    _body: web::Json<ChangeEmailRequest>,
) -> Result<HttpResponse, Error> {
    todo!()
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/confirm-email-change",
    tag = "auth",
    request_body = ConfirmEmailChangeRequest,
    responses(
        (status = 200, description = "Email changed", body = ConfirmEmailChangeResponse),
        (status = 400, description = "Invalid or expired token"),
    ),
)]
#[post("/auth/confirm-email-change")]
pub async fn confirm_email_change(
    _state: web::Data<AppState>,
    _body: web::Json<ConfirmEmailChangeRequest>,
) -> Result<HttpResponse, Error> {
    todo!()
}
