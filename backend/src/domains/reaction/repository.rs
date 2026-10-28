use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::relations::reaction::Reaction;

pub trait ReactionRepository: Send + Sync {
    fn find_by_user_and_post(&self, user_id: Uuid, post_id: Uuid) -> Result<Option<Reaction>>;
    fn list_by_post(&self, post_id: Uuid) -> Result<Vec<Reaction>>;
    fn summary_by_post(&self, post_id: Uuid) -> Result<Vec<(String, i64)>>;

    fn upsert(&self, user_id: Uuid, post_id: Uuid, emoji: &str) -> Result<Reaction>;
    fn delete(&self, user_id: Uuid, post_id: Uuid) -> Result<()>;
}
