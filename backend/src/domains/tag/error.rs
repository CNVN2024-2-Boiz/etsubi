use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TagError {
    #[error("Tag not found")]
    NotFound,

    #[error("Post is not available")]
    PostUnavailable,

    #[error("Tag already attached to this post")]
    AlreadyAttached,

    #[error("Tag is not attached to this post")]
    NotAttached,

    #[error("Not allowed")]
    Forbidden,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for TagError {
    fn status_code(&self) -> StatusCode {
        match self {
            TagError::NotFound | TagError::PostUnavailable => StatusCode::NOT_FOUND,
            TagError::AlreadyAttached | TagError::NotAttached => StatusCode::CONFLICT,
            TagError::Forbidden => StatusCode::FORBIDDEN,
            TagError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({
            "error": self.to_string(),
        }))
    }
}
