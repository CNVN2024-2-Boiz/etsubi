use anyhow::Result;
use chrono::DateTime;
use chrono::Utc;
use diesel::prelude::*;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::comment::repository::CommentRepository,
    infrastructure::database::{
        models::entities::{Comment, NewComment},
        schema::{comment_translation, comments},
    },
};

pub struct PostgresCommentRepo {
    pool: DbPool,
}

impl PostgresCommentRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl CommentRepository for PostgresCommentRepo {
    fn create(&self, comment: &Comment) -> Result<Comment> {
        let mut conn = self.pool.get()?;

        let new_comment = NewComment {
            parent_id: comment.parent_id,
            post_id: comment.post_id,
            user_id: comment.user_id,
            language: &comment.language,
            content: &comment.content,
            status: &comment.status,
        };

        let created = diesel::insert_into(comments::table)
            .values(&new_comment)
            .returning(Comment::as_returning())
            .get_result(&mut conn)?;

        Ok(created)
    }

    fn update_content(&self, comment: &Comment) -> Result<Comment> {
        let mut conn = self.pool.get()?;
        let now = Utc::now();

        Ok(conn.transaction::<_, diesel::result::Error, _>(|conn| {
            let updated = diesel::update(comments::table.find(comment.id))
                .set((
                    comments::content.eq(&comment.content),
                    comments::language.eq(&comment.language),
                    comments::updated_at.eq(now),
                ))
                .returning(Comment::as_returning())
                .get_result(conn)?;

            diesel::update(comment_translation::table)
                .filter(comment_translation::original_comment_id.eq(comment.id))
                .filter(comment_translation::deleted_at.is_null())
                .set((
                    comment_translation::deleted_at.eq(Some(now)),
                    comment_translation::updated_at.eq(now),
                ))
                .execute(conn)?;

            Ok(updated)
        })?)
    }

    fn update_status(&self, id: Uuid, status: &str) -> Result<Comment> {
        let mut conn = self.pool.get()?;

        let updated = diesel::update(comments::table.find(id))
            .set((
                comments::status.eq(status),
                comments::updated_at.eq(Utc::now()),
            ))
            .returning(Comment::as_returning())
            .get_result(&mut conn)?;

        Ok(updated)
    }

    fn delete(&self, id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;

        conn.transaction::<_, diesel::result::Error, _>(|conn| {
            let comment = comments::table
                .find(id)
                .select(Comment::as_select())
                .first::<Comment>(conn)
                .optional()?;

            let Some(comment) = comment else {
                return Err(diesel::result::Error::NotFound);
            };
            if comment.deleted_at.is_some() {
                return Ok(());
            }

            let now = Utc::now();
            diesel::update(comments::table.find(id))
                .set((
                    comments::deleted_at.eq(Some(now)),
                    comments::updated_at.eq(now),
                ))
                .execute(conn)?;

            diesel::update(comment_translation::table)
                .filter(comment_translation::original_comment_id.eq(id))
                .filter(comment_translation::deleted_at.is_null())
                .set((
                    comment_translation::deleted_at.eq(Some(now)),
                    comment_translation::updated_at.eq(now),
                ))
                .execute(conn)?;

            Ok(())
        })?;
        Ok(())
    }

    fn restore(&self, id: Uuid) -> Result<Comment> {
        let mut conn = self.pool.get()?;

        Ok(conn.transaction::<_, diesel::result::Error, _>(|conn| {
            let comment = comments::table
                .find(id)
                .select(Comment::as_select())
                .first::<Comment>(conn)
                .optional()?;

            let Some(comment) = comment else {
                return Err(diesel::result::Error::NotFound);
            };
            let Some(delete_time) = comment.deleted_at else {
                return Err(diesel::result::Error::NotFound);
            };

            let now = Utc::now();

            let restored = diesel::update(comments::table.find(id))
                .set((
                    comments::deleted_at.eq(None::<DateTime<Utc>>),
                    comments::updated_at.eq(now),
                ))
                .returning(Comment::as_returning())
                .get_result(conn)?;

            diesel::update(comment_translation::table)
                .filter(comment_translation::original_comment_id.eq(id))
                .filter(comment_translation::deleted_at.eq(delete_time))
                .set((
                    comment_translation::deleted_at.eq(None::<DateTime<Utc>>),
                    comment_translation::updated_at.eq(now),
                ))
                .execute(conn)?;

            Ok(restored)
        })?)
    }

    fn find_by_id(&self, id: Uuid) -> Result<Option<Comment>> {
        let mut conn = self.pool.get()?;

        let comment = comments::table
            .find(id)
            .select(Comment::as_select())
            .first(&mut conn)
            .optional()?;

        Ok(comment)
    }

    fn find_by_post(&self, post_id: Uuid) -> Result<Vec<Comment>> {
        let mut conn = self.pool.get()?;

        let comments = comments::table
            .filter(comments::post_id.eq(post_id))
            .order(comments::created_at.asc())
            .select(Comment::as_select())
            .load(&mut conn)?;

        Ok(comments)
    }

    fn find_visible_by_post(&self, post_id: Uuid) -> Result<Vec<Comment>> {
        let mut conn = self.pool.get()?;

        let comments = comments::table
            .filter(comments::post_id.eq(post_id))
            .filter(comments::status.eq("visible"))
            .filter(comments::deleted_at.is_null())
            .order(comments::created_at.asc())
            .select(Comment::as_select())
            .load(&mut conn)?;

        Ok(comments)
    }

    fn find_by_author(&self, author_id: Uuid) -> Result<Vec<Comment>> {
        let mut conn = self.pool.get()?;

        let comments = comments::table
            .filter(comments::user_id.eq(author_id))
            .filter(comments::deleted_at.is_null())
            .order(comments::created_at.desc())
            .select(Comment::as_select())
            .load(&mut conn)?;

        Ok(comments)
    }
}
