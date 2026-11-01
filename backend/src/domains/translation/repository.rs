use anyhow::Result;
use uuid::Uuid;

use crate::infrastructure::database::models::entities::{CommentTranslation, PostTranslation};

pub trait TranslationRepository: Send + Sync {
    fn find_post_translation(
        &self,
        post_id: Uuid,
        language: &str,
    ) -> Result<Option<PostTranslation>>;

    fn find_comment_translation(
        &self,
        comment_id: Uuid,
        language: &str,
    ) -> Result<Option<CommentTranslation>>;

    fn upsert_post_translation(
        &self,
        post_id: Uuid,
        language: &str,
        title: &str,
        content: &str,
    ) -> Result<PostTranslation>;

    fn upsert_comment_translation(
        &self,
        comment_id: Uuid,
        language: &str,
        content: &str,
    ) -> Result<CommentTranslation>;
}
