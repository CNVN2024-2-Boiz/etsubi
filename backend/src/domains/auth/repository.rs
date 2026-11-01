use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::User;

pub trait AuthRepository: Send + Sync {
    fn create(&self, user: &User) -> Result<User>;

    fn update_password(&self, id: Uuid, hashed_password: &str) -> Result<User>;
    fn delete(&self, id: Uuid) -> Result<()>;
}
