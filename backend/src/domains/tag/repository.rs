use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::Tag;

pub trait TagRepository: Send + Sync {
    fn find_all(&self) -> Result<Vec<Tag>>;
    fn find_by_id(&self, id: Uuid) -> Result<Option<Tag>>;

    fn list_post_ids_by_tag(&self, tag_id: Uuid) -> Result<Vec<Uuid>>;
    fn list_tags_by_post(&self, post_id: Uuid) -> Result<Vec<Tag>>;

    fn is_attached(&self, post_id: Uuid, tag_id: Uuid) -> Result<bool>;
    fn attach(&self, post_id: Uuid, tag_id: Uuid) -> Result<()>;
    fn detach(&self, post_id: Uuid, tag_id: Uuid) -> Result<()>;
}
