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
    presentation::dto::auth_dto::AuthUser,
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
            other => {
                // Lỗi thật (thường là cơ sở dữ liệu) bị thay bằng câu chung trong response, nên ghi log trước.
                tracing::error!(error = %other, detail = ?other, "auth middleware failed");
                ErrorInternalServerError("Authentication failure")
            }
        })?;

    let method = req.method().clone();
    let is_write = matches!(
        method,
        Method::POST | Method::PATCH | Method::PUT | Method::DELETE
    );

    // Người bị cấm nói vẫn được gửi báo cáo vi phạm: báo cáo chỉ tới hộp thư kiểm duyệt, không đăng gì lên diễn đàn.
    let is_report = req.path() == "/api/v1/reports";

    if is_write
        && !is_report
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

/// Ghi log nguyên nhân của mọi lỗi 5xx trong `/api/v1`.
///
/// Response 500 chỉ trả câu ngắn cho người dùng và `Logger` chỉ in dòng `POST ... 500`, nên khi
/// cơ sở dữ liệu lỗi (ví dụ chưa chạy migration) terminal không cho biết lý do. Middleware này in
/// thêm lỗi gốc (`detail` gồm cả chuỗi "Caused by" của anyhow) để dev thấy ngay.
pub async fn log_server_errors(
    req: ServiceRequest,
    next: Next<impl MessageBody>,
) -> Result<ServiceResponse<impl MessageBody>, Error> {
    let method = req.method().clone();
    let path = req.path().to_string();
    match next.call(req).await {
        Ok(res) => {
            let status = res.status();
            if status.is_server_error() {
                match res.response().error() {
                    Some(e) => tracing::error!(%method, %path, status = status.as_u16(), error = %e, detail = ?e, "request failed"),
                    None => tracing::error!(%method, %path, status = status.as_u16(), "request failed (no error attached)"),
                }
            }
            Ok(res)
        }
        // Lỗi trả thẳng từ middleware bên trong (ví dụ auth) chưa thành response ở đây.
        Err(e) => {
            let status = e.as_response_error().status_code();
            if status.is_server_error() {
                tracing::error!(%method, %path, status = status.as_u16(), error = %e, detail = ?e, "request failed");
            }
            Err(e)
        }
    }
}
