use anyhow::Result;
use diesel::prelude::*;
use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::bookmark::repository::BookmarkRepository,
    infrastructure::database::{
        models::{
            entities::Post,
            relations::bookmark::{Bookmark, NewBookmark},
        },
        schema::{bookmarks, posts},
    },
};

pub struct PostgresBookmarkRepo {
    pool: DbPool,
}

impl PostgresBookmarkRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl BookmarkRepository for PostgresBookmarkRepo {
    fn find_by_user_and_post(&self, user_id: Uuid, post_id: Uuid) -> Result<Option<Bookmark>> {
        let mut conn = self.pool.get()?;
        Ok(bookmarks::table
            .filter(bookmarks::user_id.eq(user_id))
            .filter(bookmarks::post_id.eq(post_id))
            .select(Bookmark::as_select())
            .first(&mut conn)
            .optional()?)
    }

    fn create(&self, user_id: Uuid, post_id: Uuid) -> Result<Bookmark> {
        let mut conn = self.pool.get()?;
        let new = NewBookmark { user_id, post_id };
        Ok(diesel::insert_into(bookmarks::table)
            .values(&new)
            .returning(Bookmark::as_returning())
            .get_result(&mut conn)?)
    }

    fn delete(&self, user_id: Uuid, post_id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;
        diesel::delete(
            bookmarks::table
                .filter(bookmarks::user_id.eq(user_id))
                .filter(bookmarks::post_id.eq(post_id)),
        )
        .execute(&mut conn)?;
        Ok(())
    }

    fn list_bookmarked_posts(&self, user_id: Uuid) -> Result<Vec<Post>> {
        let mut conn = self.pool.get()?;
        let post_ids: Vec<Uuid> = bookmarks::table
            .filter(bookmarks::user_id.eq(user_id))
            .order(bookmarks::bookmarked_at.desc())
            .select(bookmarks::post_id)
            .load(&mut conn)?;

        if post_ids.is_empty() {
            return Ok(vec![]);
        }

        let posts = posts::table
            .filter(posts::id.eq_any(&post_ids))
            .filter(posts::status.eq("published"))
            .filter(posts::deleted_at.is_null())
            .select(Post::as_select())
            .load::<Post>(&mut conn)?;

        let mut map: HashMap<Uuid, Post> = posts.into_iter().map(|p| (p.id, p)).collect();
        Ok(post_ids
            .into_iter()
            .filter_map(|id| map.remove(&id))
            .collect())
    }
}
