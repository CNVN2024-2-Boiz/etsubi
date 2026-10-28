use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::User;

#[derive(Serialize, ToSchema)]
pub struct FollowUserResponse {
    pub id: Uuid,
    pub username: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
}

impl From<User> for FollowUserResponse {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            username: u.username,
            avatar_url: u.avatar_url,
            bio: u.bio,
        }
    }
}

#[derive(Serialize, ToSchema)]
pub struct FollowStatusResponse {
    pub following: bool,
}

#[derive(Serialize, ToSchema)]
pub struct FollowerStatusResponse {
    pub followed_by: bool,
}
