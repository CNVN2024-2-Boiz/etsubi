use crate::infrastructure::database::schema::speaks;
use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = speaks)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Speak {
    pub user_id: Uuid,
    pub language_id: Uuid,
    pub assigned_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = speaks)]
pub struct NewSpeak {
    pub user_id: Uuid,
    pub language_id: Uuid,
}
