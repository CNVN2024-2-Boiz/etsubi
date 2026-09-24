use chrono::{DateTime, Utc};
use diesel::Queryable;

#[derive(Queryable)]
#[diesel(table_name = crate::db::schema::comments)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Comment {
    pub id: i64,
    pub parent_id: Option<i64>,
    pub post_id: i64,
    pub user_id: i64,
    pub content: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
