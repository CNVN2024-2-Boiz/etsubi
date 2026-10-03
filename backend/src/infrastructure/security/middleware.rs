use actix_web::{
    Error, HttpMessage,
    body::MessageBody,
    dev::{ServiceRequest, ServiceResponse},
    error::{ErrorInternalServerError, ErrorUnauthorized},
    middleware::Next,
    web,
};

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

    req.extensions_mut().insert(AuthUser {
        id: claims.sub,
        roles: claims.roles,
    });

    next.call(req).await
}
