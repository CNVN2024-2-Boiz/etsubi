use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::{entities::Post, relations::bookmark::Bookmark};

pub trait BookmarkRepository: Send + Sync {
    fn find_by_user_and_post(&self, user_id: Uuid, post_id: Uuid) -> Result<Option<Bookmark>>;
    fn create(&self, user_id: Uuid, post_id: Uuid) -> Result<Bookmark>;
    fn delete(&self, user_id: Uuid, post_id: Uuid) -> Result<()>;
    fn list_bookmarked_posts(&self, user_id: Uuid) -> Result<Vec<Post>>;
}
