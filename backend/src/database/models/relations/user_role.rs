use chrono::{DateTime, Utc};
use diesel::Queryable;

#[derive(Queryable)]
#[diesel(table_name = crate::db::schema::users_roles)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct UserRole {
    pub user_id: i64,
    pub role_id: i64,
    pub assigned_at: DateTime<Utc>,
}

