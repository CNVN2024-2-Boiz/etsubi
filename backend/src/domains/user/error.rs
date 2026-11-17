use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum UserError {
    #[error("User not found")]
    NotFound,

    #[error("Email already taken")]
    EmailAlreadyTaken,

    #[error("Username already taken")]
    UsernameAlreadyTaken,

    #[error("Username too short")]
    UsernameTooShort,

    #[error("Display name cannot be empty")]
    InvalidDisplayname,

    #[error("Display name too long (max 50 characters)")]
    DisplaynameTooLong,

    #[error("Invalid language code (must be vi, en, or ja)")]
    InvalidLanguage,

    #[error("Invalid status (must be active or banned)")]
    InvalidStatus,

    #[error("Invalid role (must be user or moderator)")]
    InvalidRole,

    #[error("Not allowed to edit another user's profile")]
    ForbiddenProfileEdit,

    #[error("Requires moderator or admin role")]
    RequiresStaff,

    #[error("Requires admin role")]
    RequiresAdmin,

    #[error("Cannot modify a user with an equal or higher role")]
    CannotModifyHigherRole,

    #[error("Cannot assign admin role")]
    CannotAssignAdminRole,

    #[error("Cannot change your own role")]
    CannotChangeOwnRole,

    #[error("Cannot ban yourself")]
    CannotBanSelf,

    #[error("Cannot mute yourself")]
    CannotMuteSelf,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for UserError {
    fn status_code(&self) -> StatusCode {
        match self {
            UserError::NotFound => StatusCode::NOT_FOUND,
            UserError::EmailAlreadyTaken | UserError::UsernameAlreadyTaken => StatusCode::CONFLICT,
            UserError::UsernameTooShort
            | UserError::InvalidDisplayname
            | UserError::DisplaynameTooLong
            | UserError::InvalidLanguage
            | UserError::InvalidStatus
            | UserError::InvalidRole => StatusCode::BAD_REQUEST,
            UserError::ForbiddenProfileEdit
            | UserError::RequiresStaff
            | UserError::RequiresAdmin
            | UserError::CannotModifyHigherRole
            | UserError::CannotAssignAdminRole
            | UserError::CannotChangeOwnRole
            | UserError::CannotBanSelf
            | UserError::CannotMuteSelf => StatusCode::FORBIDDEN,
            UserError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(json!({ "error": self.to_string() }))
    }
}
