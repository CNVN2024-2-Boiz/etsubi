use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::infrastructure::database::models::entities::Post;

#[derive(Debug, Deserialize)]
pub struct CreatePostRequest {
    pub title: String,
    pub content: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePostRequest {
    pub title: String,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePostStatusRequest {
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct PostResponse {
    pub id: i64,
    pub author_id: i64,
    pub title: String,
    pub content: Option<String>,
    pub view_count: i32,
    pub status: String,
    pub comments_locked: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Post> for PostResponse {
    fn from(p: Post) -> Self {
        Self {
            id: p.id,
            author_id: p.author_id,
            title: p.title,
            content: p.content,
            view_count: p.view_count,
            status: p.status,
            comments_locked: p.comments_locked,
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }
}
