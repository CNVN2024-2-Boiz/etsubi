use anyhow::Result;

use crate::infrastructure::database::models::entities::User;

pub trait UserRepository: Send + Sync {
    fn create(&self, user: &User) -> Result<User>;
    fn update(&self, user: &User) -> Result<User>;
    fn delete(&self, id: i64) -> Result<()>;
    fn find_by_id(&self, id: i64) -> Result<Option<User>>;
    fn find_by_email(&self, email: &str) -> Result<Option<User>>;
    fn find_by_username(&self, username: &str) -> Result<Option<User>>;
}
