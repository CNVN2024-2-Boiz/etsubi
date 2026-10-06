use serde::{Deserialize, Serialize};

use crate::infrastructure::database::models::entities::User;

#[derive(Deserialize)]
pub struct UpdateProfileRequest {
    pub username: Option<String>,
    pub email: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
}

#[derive(Deserialize)]
pub struct UpdateRoleRequest {
    pub role: String,
}

#[derive(Serialize)]
pub struct UserResponse {
    pub username: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub role: String,
    pub status: String,
}

impl From<User> for UserResponse {
    fn from(u: User) -> Self {
        Self {
            username: u.username,
            avatar_url: u.avatar_url,
            bio: u.bio,
            role: u.role,
            status: u.status,
        }
    }
}
