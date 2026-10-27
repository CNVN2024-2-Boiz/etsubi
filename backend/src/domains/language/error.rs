use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum LanguageError {
    #[error("Language not found")]
    NotFound,

    #[error("Language already added")]
    AlreadyAdded,

    #[error("Language not added")]
    NotAdded,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for LanguageError {
    fn status_code(&self) -> StatusCode {
        match self {
            LanguageError::NotFound => StatusCode::NOT_FOUND,
            LanguageError::AlreadyAdded | LanguageError::NotAdded => StatusCode::CONFLICT,
            LanguageError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({ "error": self.to_string() }))
    }
}
