use crate::infrastructure::database::schema::users_blocks;
use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = users_blocks)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct UserBlock {
    pub blocker_id: Uuid,
    pub blocked_id: Uuid,
    pub blocked_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = users_blocks)]
pub struct NewUserBlock {
    pub blocker_id: Uuid,
    pub blocked_id: Uuid,
}
