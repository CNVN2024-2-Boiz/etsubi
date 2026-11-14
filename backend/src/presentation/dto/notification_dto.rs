use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    domains::notification::service::NotificationContext,
    infrastructure::database::models::entities::Notification,
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

#[derive(Debug, Deserialize, ToSchema)]
pub struct ListNotificationsQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NotificationResponse {
    pub id: Uuid,
    pub kind: String,
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
            message: n.message,
            link: n.link,
            is_readed: n.is_readed,
            created_at: n.created_at,
        }
    }
}
