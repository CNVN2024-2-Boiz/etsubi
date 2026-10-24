use anyhow::Result;
use chrono::{DateTime, Utc};
use diesel::prelude::*;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::post::repository::PostRepository,
    infrastructure::database::{
        models::entities::{NewPost, Post},
        schema::posts,
    },
};

pub struct PostgresPostRepo {
    pool: DbPool,
}

impl PostgresPostRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl PostRepository for PostgresPostRepo {
    fn create(&self, post: &Post) -> Result<Post> {
        let mut conn = self.pool.get()?;

        let new_post = NewPost {
            author_id: post.author_id,
            title: &post.title,
            content: post.content.as_deref(),
            status: &post.status,
        };

        Ok(diesel::insert_into(posts::table)
            .values(&new_post)
            .returning(Post::as_returning())
            .get_result(&mut conn)?)
    }

    fn update_content(&self, post: &Post) -> Result<Post> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(posts::table.find(post.id))
            .set((
                posts::title.eq(&post.title),
                posts::content.eq(post.content.as_deref()),
                posts::updated_at.eq(Utc::now()),
            ))
            .returning(Post::as_returning())
            .get_result(&mut conn)?)
    }

    fn update_status(&self, id: Uuid, status: &str) -> Result<Post> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(posts::table.find(id))
            .set((posts::status.eq(status), posts::updated_at.eq(Utc::now())))
            .returning(Post::as_returning())
            .get_result(&mut conn)?)
    }

    fn delete(&self, id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;

        diesel::update(posts::table.find(id))
            .set((
                posts::deleted_at.eq(Some(Utc::now())),
                posts::updated_at.eq(Utc::now()),
            ))
            .execute(&mut conn)?;

        Ok(())
    }

    fn restore(&self, id: Uuid) -> Result<Post> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(posts::table.find(id))
            .set((
                posts::deleted_at.eq(None::<DateTime<Utc>>),
                posts::updated_at.eq(Utc::now()),
            ))
            .returning(Post::as_returning())
            .get_result(&mut conn)?)
    }

    fn find_by_id(&self, id: Uuid) -> Result<Option<Post>> {
        let mut conn = self.pool.get()?;

        Ok(posts::table
            .find(id)
            .select(Post::as_select())
            .first(&mut conn)
            .optional()?)
    }

    fn find_published_by_id(&self, id: Uuid) -> Result<Option<Post>> {
        let mut conn = self.pool.get()?;

        Ok(posts::table
            .find(id)
            .filter(posts::status.eq("published"))
            .filter(posts::deleted_at.is_null())
            .select(Post::as_select())
            .first(&mut conn)
            .optional()?)
    }

    fn find_by_author(&self, author_id: Uuid) -> Result<Vec<Post>> {
        let mut conn = self.pool.get()?;

        Ok(posts::table
            .filter(posts::author_id.eq(author_id))
            .filter(posts::deleted_at.is_null())
            .order(posts::created_at.desc())
            .select(Post::as_select())
            .load(&mut conn)?)
    }

    fn find_published_by_author(&self, author_id: Uuid) -> Result<Vec<Post>> {
        let mut conn = self.pool.get()?;

        Ok(posts::table
            .filter(posts::author_id.eq(author_id))
            .filter(posts::status.eq("published"))
            .filter(posts::deleted_at.is_null())
            .order(posts::created_at.desc())
            .select(Post::as_select())
            .load(&mut conn)?)
    }

    fn find_deleted_by_author(&self, author_id: Uuid) -> Result<Vec<Post>> {
        let mut conn = self.pool.get()?;

        Ok(posts::table
            .filter(posts::author_id.eq(author_id))
            .filter(posts::deleted_at.is_not_null())
            .order(posts::deleted_at.desc())
            .select(Post::as_select())
            .load(&mut conn)?)
    }

    fn find_published_by_ids(&self, ids: &[Uuid]) -> Result<Vec<Post>> {
        if ids.is_empty() {
            return Ok(vec![]);
        }
        let mut conn = self.pool.get()?;
        Ok(posts::table
            .filter(posts::id.eq_any(ids))
            .filter(posts::status.eq("published"))
            .filter(posts::deleted_at.is_null())
            .order(posts::created_at.desc())
            .select(Post::as_select())
            .load(&mut conn)?)
    }
}
