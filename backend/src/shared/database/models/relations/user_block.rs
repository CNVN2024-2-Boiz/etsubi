use crate::shared::database::schema::users_blocks;
use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = users_blocks)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct UserBlock {
    pub blocker_id: i64,
    pub blocked_id: i64,
    pub blocked_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = users_blocks)]
pub struct NewUserBlock {
    pub blocker_id: i64,
    pub blocked_id: i64,
}
