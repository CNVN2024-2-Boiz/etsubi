use chrono::{DateTime, Utc};
use diesel::Queryable;

#[derive(Queryable)]
#[diesel(table_name = crate::db::schema::users_blocks)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct UserBlock {
    pub blocker_id: i64,
    pub blocked_id: i64,
    pub blocked_at: DateTime<Utc>,
}
