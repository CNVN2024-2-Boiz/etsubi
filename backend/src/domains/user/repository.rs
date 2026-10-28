use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::User;

pub trait UserRepository: Send + Sync {
    fn update_profile(&self, user: &User) -> Result<User>;
    fn update_status(&self, id: Uuid, status: &str) -> Result<User>;
    fn update_role(&self, id: Uuid, role: &str) -> Result<User>;

    fn find_by_id(&self, id: Uuid) -> Result<Option<User>>;
    fn find_by_email(&self, email: &str) -> Result<Option<User>>;
    fn find_by_username(&self, username: &str) -> Result<Option<User>>;
}
