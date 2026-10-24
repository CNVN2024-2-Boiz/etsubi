use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::Tag;

#[derive(Debug, Serialize, ToSchema)]
pub struct TagResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
}

impl From<Tag> for TagResponse {
    fn from(t: Tag) -> Self {
        Self {
            id: t.id,
            name: t.name,
            description: t.description,
        }
    }
}
