use std::sync::Arc;

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    domains::{
        follow::repository::FollowRepository,
        notification::{error::NotificationError, repository::NotificationRepository},
        post::repository::PostRepository,
        user::repository::UserRepository,
    },
    infrastructure::database::models::entities::Notification,
};

const MAX_LINK_LEN: usize = 500;
const MAX_TITLE_PREVIEW_CHARS: usize = 60;

const VALID_KINDS: &[&str] = &[
    "follow",
    "reaction",
    "comment",
    "reply",
    "muted",
    "banned",
    "post_locked",
    "post_removed",
];

const STAFF_ONLY_KINDS: &[&str] = &["muted", "banned", "post_locked", "post_removed"];

const SELF_NOTIFY_BLOCKED_KINDS: &[&str] = &["follow", "reaction", "comment", "reply"];

pub struct NotificationContext {
    pub emoji: Option<String>,
    pub post_title: Option<String>,
    pub muted_until: Option<DateTime<Utc>>,
}

pub struct NotificationService {
    notification_repo: Arc<dyn NotificationRepository>,
    user_repo: Arc<dyn UserRepository>,
    post_repo: Arc<dyn PostRepository>,
    follow_repo: Arc<dyn FollowRepository>,
}

impl NotificationService {
    pub fn new(
        notification_repo: Arc<dyn NotificationRepository>,
        user_repo: Arc<dyn UserRepository>,
        post_repo: Arc<dyn PostRepository>,
        follow_repo: Arc<dyn FollowRepository>,
    ) -> Self {
        Self {
            notification_repo,
            user_repo,
            post_repo,
            follow_repo,
        }
    }

    pub fn create_by_actor(
        &self,
        actor_id: Uuid,
        kind: &str,
        target_user_id: Uuid,
        link: &str,
        context: Option<NotificationContext>,
    ) -> Result<Notification, NotificationError> {
        if !VALID_KINDS.contains(&kind) {
            return Err(NotificationError::InvalidKind);
        }

        if !link.starts_with('/') || link.len() > MAX_LINK_LEN {
            return Err(NotificationError::InvalidLink);
        }

        if SELF_NOTIFY_BLOCKED_KINDS.contains(&kind) && target_user_id == actor_id {
            return Err(NotificationError::CannotNotifySelf);
        }

        let actor = self
            .user_repo
            .find_by_id(actor_id)?
            .ok_or(NotificationError::UserNotFound)?;

        if target_user_id != actor_id && self.user_repo.find_by_id(target_user_id)?.is_none() {
            return Err(NotificationError::UserNotFound);
        }

        if STAFF_ONLY_KINDS.contains(&kind) && !matches!(actor.role.as_str(), "moderator" | "admin")
        {
            return Err(NotificationError::RequiresStaff);
        }

        let message = build_message(kind, &actor.username, context.as_ref())?;

        Ok(self
            .notification_repo
            .create(target_user_id, kind, &message, link)?)
    }

    pub fn fanout_post_created(
        &self,
        post_id: Uuid,
        requester_id: Uuid,
    ) -> Result<i64, NotificationError> {
        let post = self
            .post_repo
            .find_by_id(post_id)?
            .ok_or(NotificationError::PostNotFound)?;

        if post.deleted_at.is_some() || post.status != "published" {
            return Err(NotificationError::PostNotFound);
        }

        if post.author_id != requester_id {
            return Err(NotificationError::Forbidden);
        }

        let recipient_ids: Vec<Uuid> = self
            .follow_repo
            .list_follower_ids(post.author_id)?
            .into_iter()
            .filter(|id| *id != post.author_id)
            .collect();

        if recipient_ids.is_empty() {
            return Ok(0);
        }

        let author = self
            .user_repo
            .find_by_id(post.author_id)?
            .ok_or(NotificationError::UserNotFound)?;

        let preview = truncate(&post.title, MAX_TITLE_PREVIEW_CHARS);
        let message = format!("New post from {}: \"{}\"", author.username, preview);
        let link = format!("/posts/{}", post_id);

        let n =
            self.notification_repo
                .create_bulk(&recipient_ids, "post_created", &message, &link)?;
        Ok(n as i64)
    }

    pub fn list(
        &self,
        user_id: Uuid,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Notification>, NotificationError> {
        let limit = limit.unwrap_or(20).clamp(1, 100);
        let offset = offset.unwrap_or(0).max(0);
        Ok(self
            .notification_repo
            .list_by_user(user_id, limit, offset)?)
    }

    pub fn unread_count(&self, user_id: Uuid) -> Result<i64, NotificationError> {
        Ok(self.notification_repo.count_unread(user_id)?)
    }

    pub fn mark_read(
        &self,
        user_id: Uuid,
        notification_id: Uuid,
    ) -> Result<Notification, NotificationError> {
        self.notification_repo
            .mark_read(notification_id, user_id)?
            .ok_or(NotificationError::NotFound)
    }

    pub fn mark_all_read(&self, user_id: Uuid) -> Result<usize, NotificationError> {
        Ok(self.notification_repo.mark_all_read(user_id)?)
    }

    pub fn delete(&self, user_id: Uuid, notification_id: Uuid) -> Result<(), NotificationError> {
        let deleted = self.notification_repo.delete(notification_id, user_id)?;
        if deleted == 0 {
            return Err(NotificationError::NotFound);
        }
        Ok(())
    }
}

fn build_message(
    kind: &str,
    actor_username: &str,
    ctx: Option<&NotificationContext>,
) -> Result<String, NotificationError> {
    let msg = match kind {
        "follow" => format!("{} started following you", actor_username),

        "reaction" => {
            let emoji = ctx
                .and_then(|c| c.emoji.as_deref())
                .ok_or(NotificationError::MissingContext)?;
            format!("{} reacted {} to your post", actor_username, emoji)
        }

        "comment" => format!("{} commented on your post", actor_username),

        "reply" => format!("{} replied to your comment", actor_username),

        "muted" => {
            let until = ctx
                .and_then(|c| c.muted_until)
                .ok_or(NotificationError::MissingContext)?;
            format!("Your account has been muted until {}", until.to_rfc3339())
        }

        "banned" => "Your account has been banned".to_string(),

        "post_locked" => "Comments on your post have been locked".to_string(),

        "post_removed" => {
            let title = ctx
                .and_then(|c| c.post_title.as_deref())
                .map(|t| truncate(t, MAX_TITLE_PREVIEW_CHARS))
                .unwrap_or_else(|| "your post".to_string());
            format!("Your post \"{}\" has been removed", title)
        }

        _ => return Err(NotificationError::InvalidKind),
    };
    Ok(msg)
}

fn truncate(s: &str, max: usize) -> String {
    let count = s.chars().count();
    if count <= max {
        s.to_string()
    } else {
        let mut out: String = s.chars().take(max).collect();
        out.push('…');
        out
    }
}
