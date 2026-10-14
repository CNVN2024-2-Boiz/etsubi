use crate::infrastructure::database::schema::users_follows;
use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = users_follows)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct UserFollow {
    pub follower_id: Uuid,
    pub following_id: Uuid,
    pub followed_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = users_follows)]
pub struct NewUserFollow {
    pub follower_id: Uuid,
    pub following_id: Uuid,
}
