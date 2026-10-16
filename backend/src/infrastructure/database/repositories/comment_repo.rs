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
        schema::comments,
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

        let updated = diesel::update(comments::table.find(comment.id))
            .set((
                comments::content.eq(&comment.content),
                comments::updated_at.eq(Utc::now()),
            ))
            .returning(Comment::as_returning())
            .get_result(&mut conn)?;

        Ok(updated)
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

        diesel::update(comments::table.find(id))
            .set((
                comments::deleted_at.eq(Some(Utc::now())),
                comments::updated_at.eq(Utc::now()),
            ))
            .execute(&mut conn)?;

        Ok(())
    }

    fn restore(&self, id: Uuid) -> Result<Comment> {
        let mut conn = self.pool.get()?;

        let comment = diesel::update(comments::table.find(id))
            .set((
                comments::deleted_at.eq(None::<DateTime<Utc>>),
                comments::updated_at.eq(Utc::now()),
            ))
            .returning(Comment::as_returning())
            .get_result(&mut conn)?;

        Ok(comment)
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
