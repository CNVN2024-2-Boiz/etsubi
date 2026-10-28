use anyhow::Result;
use chrono::Utc;
use diesel::dsl::count_star;
use diesel::prelude::*;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::reaction::repository::ReactionRepository,
    infrastructure::database::{
        models::relations::reaction::{NewReaction, Reaction},
        schema::reactions,
    },
};

pub struct PostgresReactionRepo {
    pool: DbPool,
}

impl PostgresReactionRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl ReactionRepository for PostgresReactionRepo {
    fn find_by_user_and_post(&self, user_id: Uuid, post_id: Uuid) -> Result<Option<Reaction>> {
        let mut conn = self.pool.get()?;
        Ok(reactions::table
            .filter(reactions::user_id.eq(user_id))
            .filter(reactions::post_id.eq(post_id))
            .select(Reaction::as_select())
            .first(&mut conn)
            .optional()?)
    }

    fn list_by_post(&self, post_id: Uuid) -> Result<Vec<Reaction>> {
        let mut conn = self.pool.get()?;
        Ok(reactions::table
            .filter(reactions::post_id.eq(post_id))
            .order(reactions::reacted_at.desc())
            .select(Reaction::as_select())
            .load(&mut conn)?)
    }

    fn summary_by_post(&self, post_id: Uuid) -> Result<Vec<(String, i64)>> {
        let mut conn = self.pool.get()?;
        Ok(reactions::table
            .filter(reactions::post_id.eq(post_id))
            .group_by(reactions::emoji)
            .select((reactions::emoji, count_star()))
            .order(count_star().desc())
            .load::<(String, i64)>(&mut conn)?)
    }

    fn upsert(&self, user_id: Uuid, post_id: Uuid, emoji: &str) -> Result<Reaction> {
        let mut conn = self.pool.get()?;
        let new = NewReaction {
            user_id,
            post_id,
            emoji,
        };

        Ok(diesel::insert_into(reactions::table)
            .values(&new)
            .on_conflict((reactions::user_id, reactions::post_id))
            .do_update()
            .set((
                reactions::emoji.eq(emoji),
                reactions::reacted_at.eq(Utc::now()),
            ))
            .returning(Reaction::as_returning())
            .get_result(&mut conn)?)
    }

    fn delete(&self, user_id: Uuid, post_id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;
        diesel::delete(
            reactions::table
                .filter(reactions::user_id.eq(user_id))
                .filter(reactions::post_id.eq(post_id)),
        )
        .execute(&mut conn)?;
        Ok(())
    }
}
