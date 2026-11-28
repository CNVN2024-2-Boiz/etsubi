use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

/// Lỗi khi gửi báo cáo vi phạm. Mỗi lỗi có `code` cố định để front end dịch sang tiếng Việt.
#[derive(Debug, Error)]
pub enum ReportError {
    #[error("Invalid target type (must be post, comment or user)")]
    InvalidTarget,

    #[error("Choose at least one valid reason")]
    InvalidReason,

    #[error("Please describe the problem when choosing Other")]
    DetailsRequired,

    #[error("Details are too long (max 1000 characters)")]
    DetailsTooLong,

    #[error("Reported content not found")]
    TargetNotFound,

    #[error("You cannot report yourself or your own content")]
    CannotReportSelf,

    #[error("You already reported this recently. Please wait before sending again")]
    Cooldown,

    #[error("Too many reports. Please try again later")]
    TooManyReports,

    #[error("User not found")]
    ReporterNotFound,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ReportError {
    /// Mã ổn định gửi kèm `error`, front end dựa vào mã này để hiện thông báo.
    pub fn code(&self) -> &'static str {
        match self {
            ReportError::InvalidTarget => "invalid_target",
            ReportError::InvalidReason => "invalid_reason",
            ReportError::DetailsRequired => "details_required",
            ReportError::DetailsTooLong => "details_too_long",
            ReportError::TargetNotFound => "target_not_found",
            ReportError::CannotReportSelf => "cannot_report_self",
            ReportError::Cooldown => "report_cooldown",
            ReportError::TooManyReports => "report_limit",
            ReportError::ReporterNotFound => "user_not_found",
            ReportError::Internal(_) => "internal",
        }
    }
}

impl ResponseError for ReportError {
    fn status_code(&self) -> StatusCode {
        match self {
            ReportError::InvalidTarget
            | ReportError::InvalidReason
            | ReportError::DetailsRequired
            | ReportError::DetailsTooLong
            | ReportError::CannotReportSelf => StatusCode::BAD_REQUEST,
            ReportError::TargetNotFound => StatusCode::NOT_FOUND,
            // 409 thay vì 429: client.js tự gửi lại mọi lỗi 429 và tạm dừng cả hàng đợi, không hợp với lỗi này.
            ReportError::Cooldown | ReportError::TooManyReports => StatusCode::CONFLICT,
            ReportError::ReporterNotFound => StatusCode::UNAUTHORIZED,
            ReportError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code())
            .json(json!({ "error": self.to_string(), "code": self.code() }))
    }
}
