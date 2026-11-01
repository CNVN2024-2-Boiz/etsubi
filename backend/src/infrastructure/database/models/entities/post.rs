use crate::infrastructure::database::schema::posts;
use chrono::{DateTime, Utc};
use diesel::{Identifiable, Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable, Identifiable)]
#[diesel(table_name = posts)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Post {
    pub id: Uuid,
    pub author_id: Uuid,
    pub title: String,
    pub content: String,
    pub language: String,
    pub status: String,
    pub comments_locked: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = posts)]
pub struct NewPost<'a> {
    pub author_id: Uuid,
    pub title: &'a str,
    pub content: &'a str,
    pub language: &'a str,
    pub status: &'a str,
}
