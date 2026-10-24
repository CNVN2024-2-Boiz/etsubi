use anyhow::Result;
use diesel::prelude::*;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::tag::repository::TagRepository,
    infrastructure::database::{
        models::{entities::tag::Tag, relations::post_tag::NewPostTag},
        schema::{posts_tags, tags},
    },
};

pub struct PostgresTagRepo {
    pool: DbPool,
}

impl PostgresTagRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl TagRepository for PostgresTagRepo {
    fn find_all(&self) -> Result<Vec<Tag>> {
        let mut conn = self.pool.get()?;
        Ok(tags::table
            .order(tags::name.asc())
            .select(Tag::as_select())
            .load(&mut conn)?)
    }

    fn find_by_id(&self, id: Uuid) -> Result<Option<Tag>> {
        let mut conn = self.pool.get()?;
        Ok(tags::table
            .find(id)
            .select(Tag::as_select())
            .first(&mut conn)
            .optional()?)
    }

    fn list_post_ids_by_tag(&self, tag_id: Uuid) -> Result<Vec<Uuid>> {
        let mut conn = self.pool.get()?;
        Ok(posts_tags::table
            .filter(posts_tags::tag_id.eq(tag_id))
            .select(posts_tags::post_id)
            .load(&mut conn)?)
    }

    fn list_tags_by_post(&self, post_id: Uuid) -> Result<Vec<Tag>> {
        let mut conn = self.pool.get()?;
        Ok(posts_tags::table
            .inner_join(tags::table)
            .filter(posts_tags::post_id.eq(post_id))
            .order(tags::name.asc())
            .select(Tag::as_select())
            .load(&mut conn)?)
    }

    fn is_attached(&self, post_id: Uuid, tag_id: Uuid) -> Result<bool> {
        let mut conn = self.pool.get()?;
        let count: i64 = posts_tags::table
            .filter(posts_tags::post_id.eq(post_id))
            .filter(posts_tags::tag_id.eq(tag_id))
            .count()
            .get_result(&mut conn)?;
        Ok(count > 0)
    }

    fn attach(&self, post_id: Uuid, tag_id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;
        let row = NewPostTag { post_id, tag_id };
        diesel::insert_into(posts_tags::table)
            .values(&row)
            .execute(&mut conn)?;
        Ok(())
    }

    fn detach(&self, post_id: Uuid, tag_id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;
        diesel::delete(
            posts_tags::table
                .filter(posts_tags::post_id.eq(post_id))
                .filter(posts_tags::tag_id.eq(tag_id)),
        )
        .execute(&mut conn)?;
        Ok(())
    }
}
