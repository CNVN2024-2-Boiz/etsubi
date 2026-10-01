use crate::shared::database::schema::bookmarks;
use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = bookmarks)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Bookmark {
    pub user_id: i64,
    pub post_id: i64,
    pub bookmarked_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = bookmarks)]
pub struct NewBookmark {
    pub user_id: i64,
    pub post_id: i64,
}
