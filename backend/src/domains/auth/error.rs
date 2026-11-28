use actix_web::{HttpResponse, ResponseError, http::StatusCode};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Username too short")]
    UsernameTooShort,

    #[error("Username must be 3-30 characters, lowercase a-z, 0-9 or underscore")]
    InvalidUsername,

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

    #[error("Invalid language code (must be vi, en, or ja)")]
    InvalidLanguage,

    #[error("Display name too long (max 50 characters)")]
    DisplaynameTooLong,

    #[error("Admin account cannot be self-deleted")]
    CannotDeleteAdmin,

    #[error("You must accept the Terms of Use and the Privacy Policy")]
    ConsentRequired,

    #[error("Email not verified")]
    EmailNotVerified,

    #[error("Email already verified")]
    AlreadyVerified,

    #[error("This link is invalid or has expired")]
    InvalidLink,

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl ResponseError for AuthError {
    fn status_code(&self) -> StatusCode {
        match self {
            AuthError::InvalidCredentials | AuthError::InvalidToken => StatusCode::UNAUTHORIZED,
            AuthError::AccountBanned | AuthError::EmailNotVerified => StatusCode::FORBIDDEN,
            AuthError::UserNotFound => StatusCode::NOT_FOUND,
            AuthError::UsernameTooShort
            | AuthError::InvalidUsername
            | AuthError::WeakPassword
            | AuthError::InvalidLanguage
            | AuthError::DisplaynameTooLong
            | AuthError::CannotDeleteAdmin
            | AuthError::ConsentRequired
            | AuthError::InvalidLink => StatusCode::BAD_REQUEST,
            AuthError::AlreadyVerified => StatusCode::CONFLICT,
            AuthError::EmailAlreadyExists | AuthError::UsernameAlreadyTaken => StatusCode::CONFLICT,
            AuthError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code())
            .json(json!({ "error": self.to_string(), "code": self.code() }))
    }
}

impl AuthError {
    /// Mã ổn định để frontend phân biệt lỗi mà không phải so chuỗi thông báo.
    pub fn code(&self) -> &'static str {
        match self {
            AuthError::InvalidCredentials => "invalid_credentials",
            AuthError::UsernameTooShort => "username_too_short",
            AuthError::InvalidUsername => "invalid_username",
            AuthError::EmailAlreadyExists => "email_taken",
            AuthError::UsernameAlreadyTaken => "username_taken",
            AuthError::AccountBanned => "account_banned",
            AuthError::InvalidToken => "invalid_token",
            AuthError::UserNotFound => "user_not_found",
            AuthError::WeakPassword => "weak_password",
            AuthError::InvalidLanguage => "invalid_language",
            AuthError::DisplaynameTooLong => "displayname_too_long",
            AuthError::CannotDeleteAdmin => "cannot_delete_admin",
            AuthError::ConsentRequired => "consent_required",
            AuthError::EmailNotVerified => "email_not_verified",
            AuthError::AlreadyVerified => "already_verified",
            AuthError::InvalidLink => "invalid_link",
            AuthError::Internal(_) => "internal",
        }
    }
}
