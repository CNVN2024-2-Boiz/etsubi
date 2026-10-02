use crate::infrastructure::database::schema::reactions;
use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = reactions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Reaction {
    pub user_id: i64,
    pub post_id: i64,
    pub emoji: String,
    pub reacted_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = reactions)]
pub struct NewReaction<'a> {
    pub user_id: i64,
    pub post_id: i64,
    pub emoji: &'a str,
}
