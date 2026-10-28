use crate::infrastructure::database::schema::languages;
use chrono::{DateTime, Utc};
use diesel::{Identifiable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable, Identifiable)]
#[diesel(table_name = languages)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Language {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
