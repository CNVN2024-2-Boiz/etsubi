use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum FollowError {
    #[error("User not found")]
    UserNotFound,

    #[error("Cannot follow yourself")]
    CannotFollowSelf,

    #[error("Already following this user")]
    AlreadyFollowing,

    #[error("Not following this user")]
    NotFollowing,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for FollowError {
    fn status_code(&self) -> StatusCode {
        match self {
            FollowError::UserNotFound => StatusCode::NOT_FOUND,
            FollowError::CannotFollowSelf => StatusCode::BAD_REQUEST,
            FollowError::AlreadyFollowing | FollowError::NotFollowing => StatusCode::CONFLICT,
            FollowError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({ "error": self.to_string() }))
    }
}
