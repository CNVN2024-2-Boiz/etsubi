use actix_web::{
    Error, FromRequest, HttpMessage, HttpRequest, dev::Payload, error::ErrorUnauthorized,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::future::{Ready, ready};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Deserialize, ToSchema)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct RegisterResponse {
    pub user_id: Uuid,
}

#[derive(Deserialize, ToSchema)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct LoginResponse {
    pub user_id: Uuid,
    pub token: String,
}

#[derive(Deserialize, ToSchema)]
pub struct VerifyEmailRequest {
    pub token: String,
}

#[derive(Serialize, ToSchema)]
pub struct VerifyEmailResponse {
    pub user_id: Uuid,
}

#[derive(Deserialize, ToSchema)]
pub struct ResendVerificationRequest {
    pub email: String,
}

#[derive(Serialize, ToSchema)]
pub struct ResendVerificationResponse {
    pub message: String,
}

#[derive(Debug, Clone)]
pub struct CurrentUser {
    pub id: Uuid,
    pub role: String,
    pub status: String,
    pub muted_until: Option<DateTime<Utc>>,
}

impl CurrentUser {
    pub fn has_role(&self, role: &str) -> bool {
        self.role == role
    }

    pub fn is_user(&self) -> bool {
        self.has_role("user")
    }

    pub fn is_staff(&self) -> bool {
        self.is_admin() || self.has_role("moderator")
    }

    pub fn is_admin(&self) -> bool {
        self.has_role("admin")
    }
}

impl FromRequest for CurrentUser {
    type Error = Error;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        ready(
            req.extensions()
                .get::<CurrentUser>()
                .cloned()
                .ok_or_else(|| ErrorUnauthorized("Not authenticated")),
        )
    }
}
