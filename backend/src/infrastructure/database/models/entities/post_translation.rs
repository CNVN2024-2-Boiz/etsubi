use crate::infrastructure::database::schema::post_translation;
use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = post_translation)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct PostTranslation {
    pub original_post_id: Uuid,
    pub language: String,
    pub title: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = post_translation)]
pub struct NewPostTranslation<'a> {
    pub original_post_id: Uuid,
    pub language: &'a str,
    pub title: &'a str,
    pub content: &'a str,
}
