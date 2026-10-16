use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::Comment;

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateCommentRequest {
    pub content: String,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateCommentRequest {
    pub content: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateCommentStatusRequest {
    pub status: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CommentResponse {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub post_id: Uuid,
    pub user_id: Uuid,
    pub content: Option<String>,
    pub status: String,
    pub is_deleted: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Comment> for CommentResponse {
    fn from(c: Comment) -> Self {
        let deleted = c.deleted_at.is_some();
        Self {
            id: c.id,
            parent_id: c.parent_id,
            post_id: c.post_id,
            user_id: c.user_id,
            content: if deleted { None } else { Some(c.content) },
            status: c.status,
            is_deleted: deleted,
            created_at: c.created_at,
            updated_at: c.updated_at,
        }
    }
}
