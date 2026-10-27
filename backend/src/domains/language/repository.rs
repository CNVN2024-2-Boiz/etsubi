use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::Language;

pub trait LanguageRepository: Send + Sync {
    fn find_all(&self) -> Result<Vec<Language>>;
    fn find_by_id(&self, id: Uuid) -> Result<Option<Language>>;
    fn find_by_code(&self, code: &str) -> Result<Option<Language>>;
    fn list_by_user(&self, user_id: Uuid) -> Result<Vec<Language>>;
    fn add_speak(&self, user_id: Uuid, language_id: Uuid) -> Result<()>;
    fn remove_speak(&self, user_id: Uuid, language_id: Uuid) -> Result<()>;
    fn is_speaking(&self, user_id: Uuid, language_id: Uuid) -> Result<bool>;
}
