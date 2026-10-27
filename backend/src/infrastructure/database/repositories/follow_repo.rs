use anyhow::Result;
use diesel::prelude::*;
use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::follow::repository::FollowRepository,
    infrastructure::database::{
        models::{
            entities::User,
            relations::follow::{NewUserFollow, UserFollow},
        },
        schema::{users, users_follows},
    },
};

pub struct PostgresFollowRepo {
    pool: DbPool,
}

impl PostgresFollowRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl FollowRepository for PostgresFollowRepo {
    fn is_following(&self, follower_id: Uuid, following_id: Uuid) -> Result<bool> {
        let mut conn = self.pool.get()?;
        let count: i64 = users_follows::table
            .filter(users_follows::follower_id.eq(follower_id))
            .filter(users_follows::following_id.eq(following_id))
            .count()
            .get_result(&mut conn)?;
        Ok(count > 0)
    }

    fn follow(&self, follower_id: Uuid, following_id: Uuid) -> Result<UserFollow> {
        let mut conn = self.pool.get()?;
        let new = NewUserFollow {
            follower_id,
            following_id,
        };
        Ok(diesel::insert_into(users_follows::table)
            .values(&new)
            .returning(UserFollow::as_returning())
            .get_result(&mut conn)?)
    }

    fn unfollow(&self, follower_id: Uuid, following_id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;
        diesel::delete(
            users_follows::table
                .filter(users_follows::follower_id.eq(follower_id))
                .filter(users_follows::following_id.eq(following_id)),
        )
        .execute(&mut conn)?;
        Ok(())
    }

    fn list_followers(&self, user_id: Uuid) -> Result<Vec<User>> {
        let mut conn = self.pool.get()?;
        let ids: Vec<Uuid> = users_follows::table
            .filter(users_follows::following_id.eq(user_id))
            .order(users_follows::followed_at.desc())
            .select(users_follows::follower_id)
            .load(&mut conn)?;
        if ids.is_empty() {
            return Ok(vec![]);
        }
        let list = users::table
            .filter(users::id.eq_any(&ids))
            .select(User::as_select())
            .load::<User>(&mut conn)?;
        let mut map: HashMap<Uuid, User> = list.into_iter().map(|u| (u.id, u)).collect();
        Ok(ids.into_iter().filter_map(|id| map.remove(&id)).collect())
    }

    fn list_following(&self, user_id: Uuid) -> Result<Vec<User>> {
        let mut conn = self.pool.get()?;
        let ids: Vec<Uuid> = users_follows::table
            .filter(users_follows::follower_id.eq(user_id))
            .order(users_follows::followed_at.desc())
            .select(users_follows::following_id)
            .load(&mut conn)?;
        if ids.is_empty() {
            return Ok(vec![]);
        }
        let list = users::table
            .filter(users::id.eq_any(&ids))
            .select(User::as_select())
            .load::<User>(&mut conn)?;
        let mut map: HashMap<Uuid, User> = list.into_iter().map(|u| (u.id, u)).collect();
        Ok(ids.into_iter().filter_map(|id| map.remove(&id)).collect())
    }

    fn follower_count(&self, user_id: Uuid) -> Result<i64> {
        let mut conn = self.pool.get()?;
        Ok(users_follows::table
            .filter(users_follows::following_id.eq(user_id))
            .count()
            .get_result(&mut conn)?)
    }

    fn following_count(&self, user_id: Uuid) -> Result<i64> {
        let mut conn = self.pool.get()?;
        Ok(users_follows::table
            .filter(users_follows::follower_id.eq(user_id))
            .count()
            .get_result(&mut conn)?)
    }
}
