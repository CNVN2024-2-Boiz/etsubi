use anyhow::Result;
use chrono::{DateTime, Utc};
use diesel::prelude::*;

use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::post::repository::PostRepository,
    infrastructure::database::{
        models::entities::{NewPost, Post},
        schema::{post_translation, posts},
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
            content: &post.content,
            language: &post.language,
            status: &post.status,
        };

        Ok(diesel::insert_into(posts::table)
            .values(&new_post)
            .returning(Post::as_returning())
            .get_result(&mut conn)?)
    }

    fn update_content(&self, post: &Post) -> Result<Post> {
        let mut conn = self.pool.get()?;
        let now = Utc::now();

        Ok(conn.transaction::<_, diesel::result::Error, _>(|conn| {
            let updated = diesel::update(posts::table.find(post.id))
                .set((
                    posts::title.eq(&post.title),
                    posts::content.eq(&post.content),
                    posts::language.eq(&post.language),
                    posts::updated_at.eq(now),
                ))
                .returning(Post::as_returning())
                .get_result(conn)?;

            diesel::update(post_translation::table)
                .filter(post_translation::original_post_id.eq(post.id))
                .filter(post_translation::deleted_at.is_null())
                .set((
                    post_translation::deleted_at.eq(Some(now)),
                    post_translation::updated_at.eq(now),
                ))
                .execute(conn)?;

            Ok(updated)
        })?)
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

        conn.transaction::<_, diesel::result::Error, _>(|conn| {
            let post = posts::table
                .find(id)
                .select(Post::as_select())
                .first::<Post>(conn)
                .optional()?;

            let Some(post) = post else {
                return Err(diesel::result::Error::NotFound);
            };
            if post.deleted_at.is_some() {
                return Ok(());
            }

            let now = Utc::now();

            diesel::update(posts::table.find(id))
                .set((posts::deleted_at.eq(Some(now)), posts::updated_at.eq(now)))
                .execute(conn)?;

            diesel::update(post_translation::table)
                .filter(post_translation::original_post_id.eq(id))
                .filter(post_translation::deleted_at.is_null())
                .set((
                    post_translation::deleted_at.eq(Some(now)),
                    post_translation::updated_at.eq(now),
                ))
                .execute(conn)?;

            Ok(())
        })?;

        Ok(())
    }

    fn restore(&self, id: Uuid) -> Result<Post> {
        let mut conn = self.pool.get()?;

        Ok(conn.transaction::<_, diesel::result::Error, _>(|conn| {
            let post = posts::table
                .find(id)
                .select(Post::as_select())
                .first::<Post>(conn)
                .optional()?;

            let Some(post) = post else {
                return Err(diesel::result::Error::NotFound);
            };
            let Some(delete_time) = post.deleted_at else {
                return Err(diesel::result::Error::NotFound);
            };

            let now = Utc::now();

            let restored = diesel::update(posts::table.find(id))
                .set((
                    posts::deleted_at.eq(None::<DateTime<Utc>>),
                    posts::updated_at.eq(now),
                ))
                .returning(Post::as_returning())
                .get_result(conn)?;

            diesel::update(post_translation::table)
                .filter(post_translation::original_post_id.eq(id))
                .filter(post_translation::deleted_at.eq(delete_time))
                .set((
                    post_translation::deleted_at.eq(None::<DateTime<Utc>>),
                    post_translation::updated_at.eq(now),
                ))
                .execute(conn)?;

            Ok(restored)
        })?)
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

    fn set_comments_locked(&self, id: Uuid, locked: bool) -> Result<Post> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(posts::table.find(id))
            .set((
                posts::comments_locked.eq(locked),
                posts::updated_at.eq(Utc::now()),
            ))
            .returning(Post::as_returning())
            .get_result(&mut conn)?)
    }
}
