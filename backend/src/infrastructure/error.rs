use actix_web::{HttpResponse, ResponseError};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Not found")]
    NotFound,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("{0}")]
    BadRequest(String),
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::NotFound => HttpResponse::NotFound().finish(),
            AppError::Unauthorized => HttpResponse::Unauthorized().finish(),
            AppError::Forbidden => HttpResponse::Forbidden().finish(),
            AppError::BadRequest(m) => HttpResponse::BadRequest().body(m.clone()),
        }
    }
}
