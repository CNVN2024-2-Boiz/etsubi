use anyhow::Result;
use chrono::{DateTime, Utc};
use diesel::prelude::*;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::translation::repository::TranslationRepository,
    infrastructure::database::{
        models::entities::{
            CommentTranslation, NewCommentTranslation, NewPostTranslation, PostTranslation,
        },
        schema::{comment_translation, post_translation},
    },
};

pub struct PostgresTranslationRepo {
    pool: DbPool,
}

impl PostgresTranslationRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl TranslationRepository for PostgresTranslationRepo {
    fn find_post_translation(
        &self,
        post_id: Uuid,
        language: &str,
    ) -> Result<Option<PostTranslation>> {
        let mut conn = self.pool.get()?;
        Ok(post_translation::table
            .filter(post_translation::original_post_id.eq(post_id))
            .filter(post_translation::language.eq(language))
            .filter(post_translation::deleted_at.is_null())
            .select(PostTranslation::as_select())
            .first(&mut conn)
            .optional()?)
    }

    fn find_comment_translation(
        &self,
        comment_id: Uuid,
        language: &str,
    ) -> Result<Option<CommentTranslation>> {
        let mut conn = self.pool.get()?;
        Ok(comment_translation::table
            .filter(comment_translation::original_comment_id.eq(comment_id))
            .filter(comment_translation::language.eq(language))
            .filter(comment_translation::deleted_at.is_null())
            .select(CommentTranslation::as_select())
            .first(&mut conn)
            .optional()?)
    }

    fn upsert_post_translation(
        &self,
        post_id: Uuid,
        language: &str,
        title: &str,
        content: &str,
    ) -> Result<PostTranslation> {
        let mut conn = self.pool.get()?;
        let new = NewPostTranslation {
            original_post_id: post_id,
            language,
            title,
            content,
        };

        Ok(diesel::insert_into(post_translation::table)
            .values(&new)
            .on_conflict((
                post_translation::original_post_id,
                post_translation::language,
            ))
            .do_update()
            .set((
                post_translation::title.eq(title),
                post_translation::content.eq(content),
                post_translation::updated_at.eq(Utc::now()),
                post_translation::deleted_at.eq(None::<DateTime<Utc>>),
            ))
            .returning(PostTranslation::as_returning())
            .get_result(&mut conn)?)
    }

    fn upsert_comment_translation(
        &self,
        comment_id: Uuid,
        language: &str,
        content: &str,
    ) -> Result<CommentTranslation> {
        let mut conn = self.pool.get()?;
        let new = NewCommentTranslation {
            original_comment_id: comment_id,
            language,
            content,
        };

        Ok(diesel::insert_into(comment_translation::table)
            .values(&new)
            .on_conflict((
                comment_translation::original_comment_id,
                comment_translation::language,
            ))
            .do_update()
            .set((
                comment_translation::content.eq(content),
                comment_translation::updated_at.eq(Utc::now()),
                comment_translation::deleted_at.eq(None::<DateTime<Utc>>),
            ))
            .returning(CommentTranslation::as_returning())
            .get_result(&mut conn)?)
    }
}
