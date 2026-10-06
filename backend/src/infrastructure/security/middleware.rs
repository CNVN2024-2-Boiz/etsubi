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
    bootstrap::state::AppState,
    infrastructure::security::{extractor::AuthUser, jwt::verify_token},
};

pub async fn auth_middleware(
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
        .ok_or_else(|| ErrorUnauthorized("Invalid format"))?;

    let claims = verify_token(token, &state.config.jwt_key)
        .map_err(|_| ErrorUnauthorized("Invalid token"))?;

    let service = state.user_service.clone();
    let user_id = claims.sub;

    let user = web::block(move || service.get(user_id))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|_| ErrorUnauthorized("User not found"))?;

    if user.status == "banned" {
        return Err(ErrorForbidden("Your account has been banned"));
    }

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
    req.extensions_mut().insert(AuthUser {
        id: user.id,
        role: user.role,
        status: user.status,
        muted_until: user.muted_until,
    });

    next.call(req).await
}
