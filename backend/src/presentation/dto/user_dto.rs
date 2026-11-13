use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::User;

#[derive(Deserialize, ToSchema)]
pub struct UpdateProfileRequest {
    pub username: Option<String>,
    pub email: Option<String>,
    pub institute: Option<String>,
    pub address: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub native: Option<String>,
    pub language: Option<String>,
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateStatusRequest {
    pub status: String,
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateRoleRequest {
    pub role: String,
}

#[derive(Deserialize, ToSchema)]
pub struct MuteUserRequest {
    pub muted_until: Option<DateTime<Utc>>,
}

#[derive(Serialize, ToSchema)]
pub struct GetUserResponse {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub institute: Option<String>,
    pub address: Option<String>,
    pub native: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub role: String,
    pub status: String,
    pub language: String,
    pub muted_until: Option<DateTime<Utc>>,
}

#[derive(Deserialize, ToSchema)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Deserialize, ToSchema)]
pub struct DeleteAccountRequest {
    pub password: String,
}

impl From<User> for GetUserResponse {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            username: u.username,
            email: u.email,
            institute: u.institute,
            address: u.address,
            native: u.native,
            avatar_url: u.avatar_url,
            bio: u.bio,
            role: u.role,
            status: u.status,
            language: u.language,
            muted_until: u.muted_until,
        }
    }
}
