use anyhow::Result;
use chrono::Utc;
use diesel::prelude::*;

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

        let created = diesel::insert_into(posts::table)
            .values(&new_post)
            .returning(Post::as_returning())
            .get_result(&mut conn)?;

        Ok(created)
    }

    fn update_content(&self, post: &Post) -> Result<Post> {
        let mut conn = self.pool.get()?;

        let updated = diesel::update(posts::table.find(post.id))
            .set((
                posts::title.eq(&post.title),
                posts::content.eq(post.content.as_deref()),
                posts::updated_at.eq(Utc::now()),
            ))
            .returning(Post::as_returning())
            .get_result(&mut conn)?;

        Ok(updated)
    }

    fn update_status(&self, id: i64, status: &str) -> Result<Post> {
        let mut conn = self.pool.get()?;

        let updated = diesel::update(posts::table.find(id))
            .set((posts::status.eq(status), posts::updated_at.eq(Utc::now())))
            .returning(Post::as_returning())
            .get_result(&mut conn)?;

        Ok(updated)
    }

    fn delete(&self, id: i64) -> Result<()> {
        let mut conn = self.pool.get()?;

        diesel::delete(posts::table.find(id)).execute(&mut conn)?;

        Ok(())
    }

    fn find_by_id(&self, id: i64) -> Result<Option<Post>> {
        let mut conn = self.pool.get()?;

        let post = posts::table
            .find(id)
            .select(Post::as_select())
            .first(&mut conn)
            .optional()?;

        Ok(post)
    }

    fn find_by_author(&self, author_id: i64) -> Result<Vec<Post>> {
        let mut conn = self.pool.get()?;

        let posts = posts::table
            .filter(posts::author_id.eq(author_id))
            .order(posts::created_at.desc())
            .select(Post::as_select())
            .load(&mut conn)?;

        Ok(posts)
    }

    fn find_published_by_id(&self, id: i64) -> Result<Option<Post>> {
        let mut conn = self.pool.get()?;

        let post = posts::table
            .find(id)
            .filter(posts::status.eq("published"))
            .select(Post::as_select())
            .first(&mut conn)
            .optional()?;

        Ok(post)
    }

    fn find_published_by_author(&self, author_id: i64) -> Result<Vec<Post>> {
        let mut conn = self.pool.get()?;

        let posts = posts::table
            .filter(posts::author_id.eq(author_id))
            .filter(posts::status.eq("published"))
            .order(posts::created_at.desc())
            .select(Post::as_select())
            .load(&mut conn)?;

        Ok(posts)
    }
}
