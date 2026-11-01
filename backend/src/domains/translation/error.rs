use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TranslationError {
    #[error("Post not found")]
    PostNotFound,

    #[error("Comment not found")]
    CommentNotFound,

    #[error("User not found")]
    UserNotFound,

    #[error("Translation service is not configured")]
    NotConfigured,

    #[error("Content is too long to translate (max {0} characters)")]
    ContentTooLong(usize),

    #[error("Translation upstream timed out")]
    UpstreamTimeout,

    #[error("Translation upstream is unavailable")]
    UpstreamUnavailable,

    #[error("Translation upstream returned an invalid response")]
    UpstreamBadResponse,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for TranslationError {
    fn status_code(&self) -> StatusCode {
        match self {
            TranslationError::PostNotFound
            | TranslationError::CommentNotFound
            | TranslationError::UserNotFound => StatusCode::NOT_FOUND,

            TranslationError::ContentTooLong(_) => StatusCode::BAD_REQUEST,

            TranslationError::NotConfigured | TranslationError::UpstreamUnavailable => {
                StatusCode::SERVICE_UNAVAILABLE
            }

            TranslationError::UpstreamTimeout => StatusCode::GATEWAY_TIMEOUT,

            TranslationError::UpstreamBadResponse => StatusCode::BAD_GATEWAY,

            TranslationError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({ "error": self.to_string() }))
    }
}
