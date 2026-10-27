use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::{entities::User, relations::follow::UserFollow};

pub trait FollowRepository: Send + Sync {
    fn is_following(&self, follower_id: Uuid, following_id: Uuid) -> Result<bool>;
    fn follow(&self, follower_id: Uuid, following_id: Uuid) -> Result<UserFollow>;
    fn unfollow(&self, follower_id: Uuid, following_id: Uuid) -> Result<()>;
    fn list_followers(&self, user_id: Uuid) -> Result<Vec<User>>;
    fn list_following(&self, user_id: Uuid) -> Result<Vec<User>>;
    fn follower_count(&self, user_id: Uuid) -> Result<i64>;
    fn following_count(&self, user_id: Uuid) -> Result<i64>;
}
