use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum NotificationError {
    #[error("Notification not found")]
    NotFound,

    #[error("User not found")]
    UserNotFound,

    #[error("Post not found")]
    PostNotFound,

    #[error("Invalid notification kind")]
    InvalidKind,

    #[error("Requires moderator or admin role")]
    RequiresStaff,

    #[error("Not allowed")]
    Forbidden,

    #[error("Cannot notify yourself")]
    CannotNotifySelf,

    #[error("Invalid link (must start with '/' and be at most 500 chars)")]
    InvalidLink,

    #[error("Context missing for this kind")]
    MissingContext,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for NotificationError {
    fn status_code(&self) -> StatusCode {
        match self {
            NotificationError::NotFound
            | NotificationError::UserNotFound
            | NotificationError::PostNotFound => StatusCode::NOT_FOUND,
            NotificationError::InvalidKind
            | NotificationError::CannotNotifySelf
            | NotificationError::InvalidLink
            | NotificationError::MissingContext => StatusCode::BAD_REQUEST,
            NotificationError::RequiresStaff | NotificationError::Forbidden => {
                StatusCode::FORBIDDEN
            }
            NotificationError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({ "error": self.to_string() }))
    }
}
