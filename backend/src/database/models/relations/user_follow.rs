use chrono::{DateTime, Utc};
use diesel::Queryable;

#[derive(Queryable)]
#[diesel(table_name = crate::db::schema::users_follows)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct UserFollow {
    pub follower_id: i64,
    pub following_id: i64,
    pub followed_at: DateTime<Utc>,
}
