use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    domains::notification::service::NotificationContext,
    infrastructure::database::models::entities::{Notification, User},
};

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateNotificationRequest {
    pub kind: String,
    pub target_user_id: Uuid,
    pub link: String,
    pub context: Option<NotificationContextDto>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct NotificationContextDto {
    pub emoji: Option<String>,
    pub post_title: Option<String>,
    pub muted_until: Option<DateTime<Utc>>,
}

impl From<NotificationContextDto> for NotificationContext {
    fn from(dto: NotificationContextDto) -> Self {
        Self {
            emoji: dto.emoji,
            post_title: dto.post_title,
            muted_until: dto.muted_until,
        }
    }
}

#[derive(Deserialize, ToSchema)]
pub struct CreateMentionNotificationsRequest {
    pub post_id: Option<Uuid>,
    pub comment_id: Option<Uuid>,
    pub mentioned_usernames: Vec<String>,
}

#[derive(Serialize, ToSchema)]
pub struct CreateMentionNotificationsResponse {
    pub created: usize,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ListNotificationsQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NotificationResponse {
    pub id: Uuid,
    pub kind: String,
    pub actor_id: Option<Uuid>,
    pub actor_username: Option<String>,
    pub actor_displayname: Option<String>,
    pub actor_avatar_url: Option<String>,
    pub message: String,
    pub link: String,
    pub is_readed: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct UnreadCountResponse {
    pub count: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct MarkAllReadResponse {
    pub marked: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NotifyFollowersResponse {
    pub notified: i64,
}

impl From<Notification> for NotificationResponse {
    fn from(n: Notification) -> Self {
        Self {
            id: n.id,
            kind: n.kind,
            actor_id: n.actor_id,
            actor_username: None,
            actor_displayname: None,
            actor_avatar_url: None,
            message: n.message,
            link: n.link,
            is_readed: n.is_readed,
            created_at: n.created_at,
        }
    }
}

impl NotificationResponse {
    pub fn with_actor(mut self, actor: Option<&User>) -> Self {
        if let Some(a) = actor {
            self.actor_username = Some(a.username.clone());
            self.actor_displayname = Some(a.displayname.clone());
            self.actor_avatar_url = a.avatar_url.clone();
        }
        self
    }
}
