use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::User;

pub trait AuthRepository: Send + Sync {
    fn create(&self, user: &User) -> Result<User>;

    fn find_by_id(&self, id: Uuid) -> Result<Option<User>>;
    fn find_by_email(&self, email: &str) -> Result<Option<User>>;
    fn find_by_username(&self, username: &str) -> Result<Option<User>>;

    fn update_password(&self, id: Uuid, hashed_password: &str) -> Result<User>;
    fn delete(&self, id: Uuid) -> Result<()>;
}
