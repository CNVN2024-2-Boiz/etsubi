use chrono::{DateTime, Utc};
use diesel::Queryable;

#[derive(Queryable)]
#[diesel(table_name = crate::db::schema::posts)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Post {
    pub id: i64,
    pub author_id: i64,
    pub title: String,
    pub content: Option<String>,
    pub view_count: i32,
    pub status: String,
    pub comments_locked: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}
