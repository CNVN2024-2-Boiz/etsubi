use crate::infrastructure::database::schema::reports;
use chrono::{DateTime, Utc};
use diesel::{Identifiable, Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable, Identifiable)]
#[diesel(table_name = reports)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Report {
    pub id: Uuid,
    pub reporter_id: Uuid,
    pub post_id: Option<Uuid>,
    pub comment_id: Option<Uuid>,
    pub reason: String,
    pub detail: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = reports)]
pub struct NewReport<'a> {
    pub reporter_id: Uuid,
    pub post_id: Option<Uuid>,
    pub comment_id: Option<Uuid>,
    pub reason: &'a str,
    pub detail: Option<&'a str>,
    pub status: &'a str,
}
