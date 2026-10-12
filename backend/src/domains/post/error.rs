use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PostError {
    #[error("Post not found")]
    NotFound,

    #[error("Title cannot be empty")]
    EmptyTitle,

    #[error("Title too long")]
    TitleTooLong,

    #[error("Content too long")]
    ContentTooLong,

    #[error("Invalid status")]
    InvalidStatus,

    #[error("Not allowed")]
    Forbidden,

    #[error("Only staff can hide posts")]
    OnlyStaffCanHide,

    #[error("Post is hidden, cannot edit")]
    HiddenCannotEdit,

    #[error("Post is hidden, only staff can change status")]
    HiddenOnlyStaffCanChangeStatus,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for PostError {
    fn status_code(&self) -> StatusCode {
        match self {
            PostError::NotFound => StatusCode::NOT_FOUND,

            PostError::EmptyTitle
            | PostError::TitleTooLong
            | PostError::ContentTooLong
            | PostError::InvalidStatus => StatusCode::BAD_REQUEST,

            PostError::Forbidden
            | PostError::OnlyStaffCanHide
            | PostError::HiddenCannotEdit
            | PostError::HiddenOnlyStaffCanChangeStatus => StatusCode::FORBIDDEN,

            PostError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({
            "error": self.to_string(),
        }))
    }
}
