use anyhow::Result;

use crate::infrastructure::database::models::entities::Post;

pub trait PostRepository: Send + Sync {
    fn create(&self, post: &Post) -> Result<Post>;
    fn update_content(&self, post: &Post) -> Result<Post>;
    fn update_status(&self, id: i64, status: &str) -> Result<Post>;
    fn delete(&self, id: i64) -> Result<()>;

    fn find_by_id(&self, id: i64) -> Result<Option<Post>>;
    fn find_published_by_id(&self, id: i64) -> Result<Option<Post>>;
    fn find_by_author(&self, author_id: i64) -> Result<Vec<Post>>;
    fn find_published_by_author(&self, author_id: i64) -> Result<Vec<Post>>;
}
