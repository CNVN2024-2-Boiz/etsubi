use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::{ConsentRecord, NewConsent, User};

pub trait AuthRepository: Send + Sync {
    /// Tạo tài khoản và các bản ghi đồng ý trong cùng một transaction.
    fn create(&self, user: &User, consents: &[NewConsent]) -> Result<User>;

    fn update_password(&self, id: Uuid, hashed_password: &str) -> Result<User>;

    fn increment_token_version(&self, id: Uuid) -> Result<i32>;

    fn delete(&self, id: Uuid) -> Result<()>;

    /// Chuyển tài khoản từ 'pending' sang 'active'; trả về false nếu tài khoản không còn 'pending'.
    fn activate(&self, id: Uuid) -> Result<bool>;

    fn list_consents(&self, user_id: Uuid) -> Result<Vec<ConsentRecord>>;
}
