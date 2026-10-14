use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::Post;

pub trait PostRepository: Send + Sync {
    fn create(&self, post: &Post) -> Result<Post>;
    fn update_content(&self, post: &Post) -> Result<Post>;
    fn update_status(&self, id: Uuid, status: &str) -> Result<Post>;
    fn delete(&self, id: Uuid) -> Result<()>;
    fn restore(&self, id: Uuid) -> Result<Post>;

    fn find_by_id(&self, id: Uuid) -> Result<Option<Post>>;
    fn find_published_by_id(&self, id: Uuid) -> Result<Option<Post>>;
    fn find_by_author(&self, author_id: Uuid) -> Result<Vec<Post>>;
    fn find_published_by_author(&self, author_id: Uuid) -> Result<Vec<Post>>;
    fn find_deleted_by_author(&self, author_id: Uuid) -> Result<Vec<Post>>;
}
