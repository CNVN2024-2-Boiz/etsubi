use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::Language;

#[derive(Serialize, ToSchema)]
pub struct LanguageResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
}

impl From<Language> for LanguageResponse {
    fn from(l: Language) -> Self {
        Self {
            id: l.id,
            code: l.code,
            name: l.name,
        }
    }
}
