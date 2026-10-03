use serde::Serialize;

use crate::infrastructure::database::models::entities::User;

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
