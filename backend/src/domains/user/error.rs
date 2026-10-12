use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum UserError {
    #[error("User not found")]
    NotFound,

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Username too short")]
    UsernameTooShort,

    #[error("Invalid status")]
    InvalidStatus,

    #[error("Invalid role")]
    InvalidRole,

    #[error("Email already exists")]
    EmailAlreadyExists,

    #[error("Username already taken")]
    UsernameAlreadyTaken,

    #[error("Email already taken")]
    EmailAlreadyTaken,

    #[error("You can only edit your own profile")]
    ForbiddenProfileEdit,

    #[error("Cannot modify admin")]
    CannotModifyAdmin,

    #[error("Cannot ban yourself")]
    CannotBanSelf,

    #[error("Cannot change your own role")]
    CannotChangeOwnRole,

    #[error("Cannot change admin role")]
    CannotChangeAdminRole,

    #[error("Cannot assign admin role")]
    CannotAssignAdminRole,

    #[error("Requires admin")]
    RequiresAdmin,

    #[error("Requires moderator or admin")]
    RequiresStaff,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for UserError {
    fn status_code(&self) -> StatusCode {
        match self {
            UserError::NotFound => StatusCode::NOT_FOUND,
            UserError::InvalidCredentials => StatusCode::UNAUTHORIZED,

            UserError::UsernameTooShort | UserError::InvalidStatus | UserError::InvalidRole => {
                StatusCode::BAD_REQUEST
            }

            UserError::EmailAlreadyExists
            | UserError::UsernameAlreadyTaken
            | UserError::EmailAlreadyTaken => StatusCode::CONFLICT,

            UserError::ForbiddenProfileEdit
            | UserError::CannotModifyAdmin
            | UserError::CannotBanSelf
            | UserError::CannotChangeOwnRole
            | UserError::CannotChangeAdminRole
            | UserError::RequiresAdmin
            | UserError::RequiresStaff
            | UserError::CannotAssignAdminRole => StatusCode::FORBIDDEN,

            UserError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({
            "error": self.to_string(),
        }))
    }
}
