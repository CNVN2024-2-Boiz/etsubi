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
    pub displayname: Option<String>,
    pub username: String,
    pub email: String,
    pub password: String,
    pub native: String,
    pub language: String,
    /// Ô "Tôi đồng ý Điều khoản sử dụng và xác nhận đủ 16 tuổi".
    #[serde(default)]
    pub accept_terms: bool,
    /// Ô "Tôi đồng ý xử lý dữ liệu cá nhân theo Chính sách quyền riêng tư".
    #[serde(default)]
    pub accept_privacy: bool,
}

#[derive(Serialize, ToSchema)]
pub struct RegisterResponse {
    pub user_id: Uuid,
    /// Luôn là "pending": cần bấm link trong mail trước khi đăng nhập.
    pub status: String,
}

#[derive(Deserialize, ToSchema)]
pub struct EmailRequest {
    pub email: String,
}

#[derive(Deserialize, ToSchema)]
pub struct EmailTokenRequest {
    pub token: String,
}

#[derive(Deserialize, ToSchema)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct ConsentResponse {
    pub purpose: String,
    pub document_version: String,
    pub granted_at: DateTime<Utc>,
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

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub role: String,
    pub status: String,
    pub muted_until: Option<DateTime<Utc>>,
}

impl AuthUser {
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

impl FromRequest for AuthUser {
    type Error = Error;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        ready(
            req.extensions()
                .get::<AuthUser>()
                .cloned()
                .ok_or_else(|| ErrorUnauthorized("Not authenticated")),
        )
    }
}
