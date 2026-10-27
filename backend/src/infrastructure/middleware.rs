use actix_web::{
    Error, HttpMessage,
    body::MessageBody,
    dev::{ServiceRequest, ServiceResponse},
    error::{ErrorForbidden, ErrorInternalServerError, ErrorUnauthorized},
    http::Method,
    middleware::Next,
    web,
};
use chrono::Utc;

use crate::{
    bootstrap::state::AppState, domains::auth::error::AuthError,
    presentation::dto::auth_dto::CurrentUser,
};

pub async fn auth(
    req: ServiceRequest,
    next: Next<impl MessageBody>,
) -> Result<ServiceResponse<impl MessageBody>, Error> {
    let state = req
        .app_data::<web::Data<AppState>>()
        .ok_or_else(|| ErrorInternalServerError("AppState missing"))?
        .clone();

    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| ErrorUnauthorized("Missing Authorization header"))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| ErrorUnauthorized("Invalid format"))?
        .to_string();

    let service = state.auth_service.clone();
    let user = web::block(move || service.authenticate(&token))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|e| match e {
            AuthError::InvalidToken => ErrorUnauthorized("Invalid token"),
            AuthError::UserNotFound => ErrorUnauthorized("User not found"),
            AuthError::AccountBanned => ErrorForbidden("Your account has been banned"),
            _ => ErrorInternalServerError("Authentication failure"),
        })?;

    let method = req.method().clone();
    let is_write = matches!(
        method,
        Method::POST | Method::PATCH | Method::PUT | Method::DELETE
    );

    if is_write
        && let Some(until) = user.muted_until
        && until > Utc::now()
    {
        let msg = format!(
            "Your account is muted until {}. You can still read content.",
            until.to_rfc3339()
        );
        return Err(ErrorForbidden(msg));
    }

    req.extensions_mut().insert(CurrentUser {
        id: user.id,
        role: user.role,
        status: user.status,
        muted_until: user.muted_until,
    });

    next.call(req).await
}
