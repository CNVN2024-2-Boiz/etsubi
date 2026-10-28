use anyhow::Result;
use chrono::Utc;
use diesel::prelude::*;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::user::repository::UserRepository,
    infrastructure::database::{models::entities::User, schema::users},
};

pub struct PostgresUserRepo {
    pool: DbPool,
}

impl PostgresUserRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl UserRepository for PostgresUserRepo {
    fn update_profile(&self, user: &User) -> Result<User> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(users::table.find(user.id))
            .set((
                users::username.eq(&user.username),
                users::email.eq(&user.email),
                users::school.eq(&user.school),
                users::address.eq(&user.address),
                users::avatar_url.eq(&user.avatar_url),
                users::bio.eq(&user.bio),
                users::updated_at.eq(Utc::now()),
            ))
            .get_result(&mut conn)?)
    }

    fn update_status(&self, id: Uuid, status: &str) -> Result<User> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(users::table.find(id))
            .set((users::status.eq(status), users::updated_at.eq(Utc::now())))
            .get_result(&mut conn)?)
    }

    fn update_role(&self, id: Uuid, role: &str) -> Result<User> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(users::table.find(id))
            .set((users::role.eq(role), users::updated_at.eq(Utc::now())))
            .get_result(&mut conn)?)
    }

    fn find_by_id(&self, id: Uuid) -> Result<Option<User>> {
        let mut conn = self.pool.get()?;
        Ok(users::table.find(id).first::<User>(&mut conn).optional()?)
    }

    fn find_by_email(&self, email: &str) -> Result<Option<User>> {
        let mut conn = self.pool.get()?;
        Ok(users::table
            .filter(users::email.eq(email))
            .first::<User>(&mut conn)
            .optional()?)
    }

    fn find_by_username(&self, username: &str) -> Result<Option<User>> {
        let mut conn = self.pool.get()?;
        Ok(users::table
            .filter(users::username.eq(username))
            .first::<User>(&mut conn)
            .optional()?)
    }
}
