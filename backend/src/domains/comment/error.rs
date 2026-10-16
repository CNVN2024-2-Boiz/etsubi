use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CommentError {
    #[error("Comment not found")]
    NotFound,

    #[error("Content cannot be empty")]
    EmptyContent,

    #[error("Content too long")]
    ContentTooLong,

    #[error("Invalid status")]
    InvalidStatus,

    #[error("Not allowed")]
    Forbidden,

    #[error("Post is locked")]
    PostLocked,

    #[error("Post is not available")]
    PostUnavailable,

    #[error("Parent comment is not available")]
    ParentUnavailable,

    #[error("Requires moderator or admin role")]
    RequiresStaff,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for CommentError {
    fn status_code(&self) -> StatusCode {
        match self {
            CommentError::NotFound
            | CommentError::PostUnavailable
            | CommentError::ParentUnavailable => StatusCode::NOT_FOUND,

            CommentError::EmptyContent
            | CommentError::ContentTooLong
            | CommentError::InvalidStatus => StatusCode::BAD_REQUEST,

            CommentError::Forbidden | CommentError::PostLocked | CommentError::RequiresStaff => {
                StatusCode::FORBIDDEN
            }

            CommentError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({
            "error": self.to_string(),
        }))
    }
}
