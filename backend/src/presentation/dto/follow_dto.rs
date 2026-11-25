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

#[derive(Debug, Serialize, ToSchema)]
pub struct SuggestedUserResponse {
    pub id: Uuid,
    pub username: String,
    pub displayname: String,
    pub avatar_url: Option<String>,
    pub follower_count: i64,
}

impl SuggestedUserResponse {
    pub fn from_pair(user: User, follower_count: i64) -> Self {
        Self {
            id: user.id,
            username: user.username,
            displayname: user.displayname,
            avatar_url: user.avatar_url,
            follower_count,
        }
    }
}
