use crate::infrastructure::database::schema::reactions;
use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = reactions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Reaction {
    pub user_id: Uuid,
    pub post_id: Uuid,
    pub emoji: String,
    pub reacted_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = reactions)]
pub struct NewReaction<'a> {
    pub user_id: Uuid,
    pub post_id: Uuid,
    pub emoji: &'a str,
}
