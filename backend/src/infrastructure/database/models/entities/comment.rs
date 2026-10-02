use crate::infrastructure::database::schema::comments;
use chrono::{DateTime, Utc};
use diesel::{Identifiable, Insertable, Queryable, Selectable};

#[derive(Debug, Queryable, Selectable, Identifiable)]
#[diesel(table_name = comments)]
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

#[derive(Insertable, Debug)]
#[diesel(table_name = comments)]
pub struct NewComment<'a> {
    pub parent_id: Option<i64>,
    pub post_id: i64,
    pub user_id: i64,
    pub content: &'a str,
    pub status: &'a str,
}
