use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::Comment;

pub trait CommentRepository: Send + Sync {
    fn create(&self, comment: &Comment) -> Result<Comment>;
    fn update_content(&self, comment: &Comment) -> Result<Comment>;
    fn update_status(&self, id: Uuid, status: &str) -> Result<Comment>;
    fn delete(&self, id: Uuid) -> Result<()>;
    fn restore(&self, id: Uuid) -> Result<Comment>;

    fn find_by_id(&self, id: Uuid) -> Result<Option<Comment>>;
    fn find_by_post(&self, post_id: Uuid) -> Result<Vec<Comment>>;
    fn find_visible_by_post(&self, post_id: Uuid) -> Result<Vec<Comment>>;
    fn find_by_author(&self, author_id: Uuid) -> Result<Vec<Comment>>;
}
