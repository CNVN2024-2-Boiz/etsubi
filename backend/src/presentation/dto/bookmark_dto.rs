use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::infrastructure::database::models::relations::bookmark::Bookmark;

#[derive(Serialize, ToSchema)]
pub struct BookmarkResponse {
    pub user_id: Uuid,
    pub post_id: Uuid,
    pub bookmarked_at: DateTime<Utc>,
}

#[derive(Serialize, ToSchema)]
pub struct BookmarkStatusResponse {
    pub bookmarked: bool,
}

impl From<Bookmark> for BookmarkResponse {
    fn from(b: Bookmark) -> Self {
        Self {
            user_id: b.user_id,
            post_id: b.post_id,
            bookmarked_at: b.bookmarked_at,
        }
    }
}
