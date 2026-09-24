use chrono::{DateTime, Utc};
use diesel::Queryable;

#[derive(Queryable)]
#[diesel(table_name = crate::db::schema::tags)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
