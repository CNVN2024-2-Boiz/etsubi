use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::Notification;

pub trait NotificationRepository: Send + Sync {
    fn create(&self, user_id: Uuid, kind: &str, message: &str, link: &str) -> Result<Notification>;

    fn create_bulk(
        &self,
        user_ids: &[Uuid],
        kind: &str,
        message: &str,
        link: &str,
    ) -> Result<usize>;

    fn find_by_id(&self, id: Uuid) -> Result<Option<Notification>>;

    fn list_by_user(&self, user_id: Uuid, limit: i64, offset: i64) -> Result<Vec<Notification>>;

    fn count_unread(&self, user_id: Uuid) -> Result<i64>;

    fn mark_read(&self, id: Uuid, user_id: Uuid) -> Result<Option<Notification>>;

    fn mark_all_read(&self, user_id: Uuid) -> Result<usize>;

    fn delete(&self, id: Uuid, user_id: Uuid) -> Result<usize>;
}
