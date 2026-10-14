use crate::infrastructure::database::schema::comments;
use chrono::{DateTime, Utc};
use diesel::{Identifiable, Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable, Identifiable)]
#[diesel(table_name = comments)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Comment {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub post_id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = comments)]
pub struct NewComment<'a> {
    pub parent_id: Option<Uuid>,
    pub post_id: Uuid,
    pub user_id: Uuid,
    pub content: &'a str,
    pub status: &'a str,
}
