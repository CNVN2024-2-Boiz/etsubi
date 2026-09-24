use chrono::{DateTime, Utc};
use diesel::Queryable;

#[derive(Queryable)]
#[diesel(table_name = crate::db::schema::reactions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Reaction {
    pub user_id: i64,
    pub post_id: i64,
    pub emoji: String,
    pub reacted_at: DateTime<Utc>,
}
