use crate::infrastructure::database::schema::comment_translation;
use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = comment_translation)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct CommentTranslation {
    pub original_comment_id: Uuid,
    pub language: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = comment_translation)]
pub struct NewCommentTranslation<'a> {
    pub original_comment_id: Uuid,
    pub language: &'a str,
    pub content: &'a str,
}
