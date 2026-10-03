use crate::infrastructure::database::schema::users_follows;
use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = users_follows)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct UserFollow {
    pub follower_id: i64,
    pub following_id: i64,
    pub followed_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = users_follows)]
pub struct NewUserFollow {
    pub follower_id: i64,
    pub following_id: i64,
}
