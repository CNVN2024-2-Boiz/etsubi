use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::User;

#[derive(Deserialize, ToSchema)]
pub struct UpdateProfileRequest {
    pub username: Option<String>,
    pub email: Option<String>,
    pub languages: Option<Vec<String>>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateStatusRequest {
    pub status: String,
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateRoleRequest {
    pub role: String,
}

#[derive(Serialize, ToSchema)]
pub struct GetUserResponse {
    pub id: Uuid,
    pub username: String,
    pub languages: Vec<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub role: String,
    pub status: String,
}

impl From<User> for GetUserResponse {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            username: u.username,
            languages: u.languages,
            avatar_url: u.avatar_url,
            bio: u.bio,
            role: u.role,
            status: u.status,
        }
    }
}
