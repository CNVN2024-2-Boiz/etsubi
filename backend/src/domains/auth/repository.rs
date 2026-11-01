use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::User;

pub trait AuthRepository: Send + Sync {
    fn create(&self, user: &User) -> Result<User>;

    fn update_password(&self, id: Uuid, hashed_password: &str) -> Result<User>;

    fn increment_token_version(&self, id: Uuid) -> Result<i32>;

    fn delete(&self, id: Uuid) -> Result<()>;
}
