use crate::infrastructure::database::schema::notifications;
use chrono::{DateTime, Utc};
use diesel::{Identifiable, Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable, Identifiable)]
#[diesel(table_name = notifications)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub kind: String,
    pub message: String,
    pub link: String,
    pub is_readed: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = notifications)]
pub struct NewNotification<'a> {
    pub user_id: Uuid,
    pub kind: &'a str,
    pub message: &'a str,
    pub link: &'a str,
}
