use actix_web::{
    Error, HttpRequest, HttpResponse, error::ErrorInternalServerError, get, http::header, post, web,
};

use crate::{
    bootstrap::state::AppState,
    domains::auth::consent::ConsentInput,
    presentation::dto::auth_dto::{
        AuthUser, ConsentResponse, EmailRequest, EmailTokenRequest, LoginRequest, LoginResponse,
        RegisterRequest, RegisterResponse, ResetPasswordRequest,
    },
};

/// Nguồn gốc yêu cầu lưu kèm bằng chứng đồng ý: IP (qua proxy thì lấy theo X-Forwarded-For)
/// và chuỗi User-Agent, cắt bớt để một header bất thường không làm phình bảng.
fn request_origin(req: &HttpRequest) -> (Option<String>, Option<String>) {
    let ip = req
        .connection_info()
        .realip_remote_addr()
        .map(|s| s.chars().take(64).collect());
    let ua = req
        .headers()
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.chars().take(512).collect());
    (ip, ua)
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/register",
    tag = "auth",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "Account created as 'pending'; a confirmation email was sent", body = RegisterResponse),
        (status = 400, description = "Invalid payload (username too short, weak password, invalid language, consent missing)"),
        (status = 409, description = "Email or username already taken"),
    ),
)]
#[post("/auth/register")]
pub async fn register(
    state: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<RegisterRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.auth_service.clone();
    let body = body.into_inner();
    let (ip_address, user_agent) = request_origin(&req);
    let consent = ConsentInput {
        accept_terms: body.accept_terms,
        accept_privacy: body.accept_privacy,
        ip_address,
        user_agent,
    };

    let user = web::block(move || {
        service.register(
            &body.username,
            &body.email,
            body.displayname.as_deref(),
            &body.native,
            &body.language,
            &body.password,
            consent,
        )
    })
    .await
    .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Created().json(RegisterResponse {
        user_id: user.id,
        status: user.status,
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    tag = "auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = LoginResponse),
        (status = 401, description = "Invalid email or password"),
        (status = 403, description = "Account is banned, or email not verified yet (code = email_not_verified)"),
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

#[utoipa::path(
    post,
    path = "/api/v1/auth/verify-email",
    tag = "auth",
    request_body = EmailTokenRequest,
    responses(
        (status = 200, description = "Email confirmed; the account is active and signed in", body = LoginResponse),
        (status = 400, description = "Link invalid or expired (code = invalid_link)"),
        (status = 409, description = "Email already confirmed (code = already_verified)"),
    ),
)]
#[post("/auth/verify-email")]
pub async fn verify_email(
    state: web::Data<AppState>,
    body: web::Json<EmailTokenRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.auth_service.clone();
    let token = body.into_inner().token;

    let (user, token) = web::block(move || service.verify_email(&token))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(LoginResponse {
        user_id: user.id,
        token,
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/resend-verification",
    tag = "auth",
    request_body = EmailRequest,
    responses(
        (status = 202, description = "If the account exists and is pending, a new confirmation email is sent"),
    ),
)]
#[post("/auth/resend-verification")]
pub async fn resend_verification(
    state: web::Data<AppState>,
    body: web::Json<EmailRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.auth_service.clone();
    let email = body.into_inner().email;

    web::block(move || service.resend_verification(&email))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Accepted().finish())
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/forgot-password",
    tag = "auth",
    request_body = EmailRequest,
    responses(
        (status = 202, description = "If the account exists, a reset link is emailed (always 202 so emails cannot be probed)"),
    ),
)]
#[post("/auth/forgot-password")]
pub async fn forgot_password(
    state: web::Data<AppState>,
    body: web::Json<EmailRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.auth_service.clone();
    let email = body.into_inner().email;

    web::block(move || service.forgot_password(&email))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Accepted().finish())
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/reset-password",
    tag = "auth",
    request_body = ResetPasswordRequest,
    responses(
        (status = 204, description = "Password changed; all sessions signed out"),
        (status = 400, description = "Link invalid or expired, or weak password"),
    ),
)]
#[post("/auth/reset-password")]
pub async fn reset_password(
    state: web::Data<AppState>,
    body: web::Json<ResetPasswordRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.auth_service.clone();
    let body = body.into_inner();

    web::block(move || service.reset_password(&body.token, &body.password))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}

#[utoipa::path(
    get,
    path = "/api/v1/my/consents",
    tag = "personal",
    responses(
        (status = 200, description = "Consent records of the signed-in user, newest first", body = [ConsentResponse]),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/consents")]
pub async fn list_my_consents(
    state: web::Data<AppState>,
    user: AuthUser,
) -> Result<HttpResponse, Error> {
    let service = state.auth_service.clone();
    let user_id = user.id;

    let records = web::block(move || service.list_consents(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let body: Vec<ConsentResponse> = records
        .into_iter()
        .map(|r| ConsentResponse {
            purpose: r.purpose,
            document_version: r.document_version,
            granted_at: r.granted_at,
        })
        .collect();
    Ok(HttpResponse::Ok().json(body))
}
