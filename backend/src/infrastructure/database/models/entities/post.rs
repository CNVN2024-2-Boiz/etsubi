use crate::infrastructure::database::schema::posts;
use chrono::{DateTime, Utc};
use diesel::{Identifiable, Insertable, Queryable, Selectable};

#[derive(Debug, Queryable, Selectable, Identifiable)]
#[diesel(table_name = posts)]
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

#[derive(Insertable, Debug)]
#[diesel(table_name = posts)]
pub struct NewPost<'a> {
    pub author_id: i64,
    pub title: &'a str,
    pub content: Option<&'a str>,
    pub status: &'a str,
}
