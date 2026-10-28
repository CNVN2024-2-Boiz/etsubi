use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ReactionError {
    #[error("Reaction not found")]
    NotFound,

    #[error("Post is not available")]
    PostUnavailable,

    #[error("Emoji cannot be empty")]
    EmptyEmoji,

    #[error("Emoji too long")]
    EmojiTooLong,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for ReactionError {
    fn status_code(&self) -> StatusCode {
        match self {
            ReactionError::NotFound | ReactionError::PostUnavailable => StatusCode::NOT_FOUND,
            ReactionError::EmptyEmoji | ReactionError::EmojiTooLong => StatusCode::BAD_REQUEST,
            ReactionError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({ "error": self.to_string() }))
    }
}
