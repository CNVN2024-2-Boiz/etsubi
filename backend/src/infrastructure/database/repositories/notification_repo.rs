use anyhow::Result;
use diesel::prelude::*;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::notification::repository::NotificationRepository,
    infrastructure::database::{
        models::entities::{NewNotification, Notification},
        schema::notifications,
    },
};

pub struct PostgresNotificationRepo {
    pool: DbPool,
}

impl PostgresNotificationRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl NotificationRepository for PostgresNotificationRepo {
    fn create(&self, user_id: Uuid, kind: &str, message: &str, link: &str) -> Result<Notification> {
        let mut conn = self.pool.get()?;
        let new = NewNotification {
            user_id,
            kind,
            message,
            link,
        };
        Ok(diesel::insert_into(notifications::table)
            .values(&new)
            .returning(Notification::as_returning())
            .get_result(&mut conn)?)
    }

    fn create_bulk(
        &self,
        user_ids: &[Uuid],
        kind: &str,
        message: &str,
        link: &str,
    ) -> Result<usize> {
        if user_ids.is_empty() {
            return Ok(0);
        }
        let mut conn = self.pool.get()?;

        let rows: Vec<NewNotification> = user_ids
            .iter()
            .map(|uid| NewNotification {
                user_id: *uid,
                kind,
                message,
                link,
            })
            .collect();

        Ok(diesel::insert_into(notifications::table)
            .values(&rows)
            .on_conflict_do_nothing()
            .execute(&mut conn)?)
    }

    fn find_by_id(&self, id: Uuid) -> Result<Option<Notification>> {
        let mut conn = self.pool.get()?;
        Ok(notifications::table
            .find(id)
            .select(Notification::as_select())
            .first(&mut conn)
            .optional()?)
    }

    fn list_by_user(&self, user_id: Uuid, limit: i64, offset: i64) -> Result<Vec<Notification>> {
        let mut conn = self.pool.get()?;
        Ok(notifications::table
            .filter(notifications::user_id.eq(user_id))
            .order(notifications::created_at.desc())
            .limit(limit)
            .offset(offset)
            .select(Notification::as_select())
            .load(&mut conn)?)
    }

    fn count_unread(&self, user_id: Uuid) -> Result<i64> {
        let mut conn = self.pool.get()?;
        Ok(notifications::table
            .filter(notifications::user_id.eq(user_id))
            .filter(notifications::is_readed.eq(false))
            .count()
            .get_result(&mut conn)?)
    }

    fn mark_read(&self, id: Uuid, user_id: Uuid) -> Result<Option<Notification>> {
        let mut conn = self.pool.get()?;
        Ok(diesel::update(notifications::table)
            .filter(notifications::id.eq(id))
            .filter(notifications::user_id.eq(user_id))
            .set(notifications::is_readed.eq(true))
            .returning(Notification::as_returning())
            .get_result(&mut conn)
            .optional()?)
    }

    fn mark_all_read(&self, user_id: Uuid) -> Result<usize> {
        let mut conn = self.pool.get()?;
        Ok(diesel::update(notifications::table)
            .filter(notifications::user_id.eq(user_id))
            .filter(notifications::is_readed.eq(false))
            .set(notifications::is_readed.eq(true))
            .execute(&mut conn)?)
    }

    fn delete(&self, id: Uuid, user_id: Uuid) -> Result<usize> {
        let mut conn = self.pool.get()?;
        Ok(diesel::delete(
            notifications::table
                .filter(notifications::id.eq(id))
                .filter(notifications::user_id.eq(user_id)),
        )
        .execute(&mut conn)?)
    }
}
