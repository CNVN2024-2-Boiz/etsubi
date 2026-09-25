use chrono::{DateTime, Utc};
use diesel::Queryable;

#[derive(Queryable)]
#[diesel(table_name = crate::db::schema::reports)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Report {
    pub id: i64,
    pub reporter_id: i64,
    pub post_id: Option<i64>,
    pub comment_id: Option<i64>,
    pub reason: String,
    pub detail: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
}
