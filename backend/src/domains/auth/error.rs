use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Username too short")]
    UsernameTooShort,

    #[error("Email already exists")]
    EmailAlreadyExists,

    #[error("Username already taken")]
    UsernameAlreadyTaken,

    #[error("Account is banned")]
    AccountBanned,

    #[error("Invalid or expired token")]
    InvalidToken,

    #[error("User not found")]
    UserNotFound,

    #[error("Password must be at least 8 characters")]
    WeakPassword,

    #[error("Admin account cannot be self-deleted")]
    CannotDeleteAdmin,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for AuthError {
    fn status_code(&self) -> StatusCode {
        match self {
            AuthError::InvalidCredentials | AuthError::InvalidToken => StatusCode::UNAUTHORIZED,
            AuthError::AccountBanned => StatusCode::FORBIDDEN,
            AuthError::UserNotFound => StatusCode::NOT_FOUND,
            AuthError::UsernameTooShort
            | AuthError::WeakPassword
            | AuthError::CannotDeleteAdmin => StatusCode::BAD_REQUEST,
            AuthError::EmailAlreadyExists | AuthError::UsernameAlreadyTaken => StatusCode::CONFLICT,
            AuthError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({ "error": self.to_string() }))
    }
}
