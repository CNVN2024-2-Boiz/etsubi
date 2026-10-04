use crate::infrastructure::database::models::entities::Tag;
use anyhow::Result;

pub trait TagRepository: Send + Sync {
    fn create(&self, tag: Tag) -> Result<Tag>;
    fn update(&self, tag: Tag) -> Result<Tag>;
    fn delete(&self, id: i64) -> Result<Tag>;
    fn find_by_id(&self, id: i64) -> Result<Option<Tag>>;
}
