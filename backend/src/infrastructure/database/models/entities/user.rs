use chrono::{DateTime, Utc};
use diesel::{Identifiable, Insertable, Queryable, Selectable};
use uuid::Uuid;

use crate::infrastructure::database::schema::users;

#[derive(Debug, Queryable, Selectable, Identifiable)]
#[diesel(table_name = users)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct User {
    pub id: Uuid,
    pub displayname: String,
    pub username: String,
    pub email: String,
    pub institute: Option<String>,
    pub address: Option<String>,
    pub native: String,
    pub language: String,
    pub password: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub role: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub muted_until: Option<DateTime<Utc>>,
    pub token_version: i32,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = crate::infrastructure::database::schema::users)]
pub struct NewUser<'a> {
    pub displayname: &'a str,
    pub username: &'a str,
    pub email: &'a str,
    pub password: Option<&'a str>,
    pub native: &'a str,
    pub language: &'a str,
    pub role: &'a str,
    pub status: &'a str,
}
