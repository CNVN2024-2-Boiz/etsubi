use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::Post;

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdatePostStatusRequest {
    pub status: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreatePostRequest {
    pub title: String,
    pub content: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdatePostRequest {
    pub title: String,
    pub content: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SearchPostsQuery {
    pub q: Option<String>,
    pub tags: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PostResponse {
    pub id: Uuid,
    pub author_id: Uuid,
    pub title: String,
    pub content: String,
    pub language: String,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
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
            language: p.language,
            latitude: p.latitude,
            longitude: p.longitude,
            status: p.status,
            comments_locked: p.comments_locked,
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }
}
