use chrono::{DateTime, Utc};
use diesel::{Identifiable, Insertable, Queryable, Selectable};
use uuid::Uuid;

use crate::infrastructure::database::schema::users_follows;

#[derive(Debug, Queryable, Selectable, Identifiable)]
#[diesel(table_name = users_follows)]
#[diesel(primary_key(follower_id, following_id))]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct UserFollow {
    pub follower_id: Uuid,
    pub following_id: Uuid,
    pub followed_at: DateTime<Utc>,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = users_follows)]
pub struct NewUserFollow {
    pub follower_id: Uuid,
    pub following_id: Uuid,
}
