use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum BookmarkError {
    #[error("Post is not available")]
    PostUnavailable,

    #[error("Bookmark not found")]
    NotFound,

    #[error("Post already bookmarked")]
    AlreadyBookmarked,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for BookmarkError {
    fn status_code(&self) -> StatusCode {
        match self {
            BookmarkError::PostUnavailable | BookmarkError::NotFound => StatusCode::NOT_FOUND,
            BookmarkError::AlreadyBookmarked => StatusCode::CONFLICT,
            BookmarkError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({ "error": self.to_string() }))
    }
}
