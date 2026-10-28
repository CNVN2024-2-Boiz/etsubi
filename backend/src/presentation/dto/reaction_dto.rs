use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::infrastructure::database::models::relations::reaction::Reaction;

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpsertReactionRequest {
    pub emoji: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReactionResponse {
    pub user_id: Uuid,
    pub post_id: Uuid,
    pub emoji: String,
    pub reacted_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReactionSummaryItem {
    pub emoji: String,
    pub count: i64,
}

impl From<Reaction> for ReactionResponse {
    fn from(r: Reaction) -> Self {
        Self {
            user_id: r.user_id,
            post_id: r.post_id,
            emoji: r.emoji,
            reacted_at: r.reacted_at,
        }
    }
}
