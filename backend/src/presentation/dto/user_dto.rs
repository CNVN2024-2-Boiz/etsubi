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

#[derive(Serialize)]
pub struct PublicUserResponse {
    pub id: i64,
    pub username: String,
    pub bio: Option<String>,
    pub status: String,
}

impl From<User> for PublicUserResponse {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            username: u.username,
            bio: u.bio,
            status: u.status,
        }
    }
}

#[derive(Serialize)]
pub struct UserResponse {
    pub id: i64,
    pub username: String,
    pub email: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub status: String,
}

impl From<User> for UserResponse {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            username: u.username,
            email: u.email,
            avatar_url: u.avatar_url,
            bio: u.bio,
            status: u.status,
        }
    }
}
