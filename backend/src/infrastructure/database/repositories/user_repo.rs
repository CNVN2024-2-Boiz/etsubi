use anyhow::Result;
use chrono::{DateTime, Utc};
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
                users::institute.eq(&user.institute),
                users::address.eq(&user.address),
                users::native.eq(&user.native),
                users::language.eq(&user.language),
                users::avatar_url.eq(&user.avatar_url),
                users::bio.eq(&user.bio),
                users::updated_at.eq(Utc::now()),
            ))
            .returning(User::as_select())
            .get_result(&mut conn)?)
    }

    fn update_status(&self, id: Uuid, status: &str) -> Result<User> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(users::table.find(id))
            .set((users::status.eq(status), users::updated_at.eq(Utc::now())))
            .returning(User::as_select())
            .get_result(&mut conn)?)
    }

    fn update_role(&self, id: Uuid, role: &str) -> Result<User> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(users::table.find(id))
            .set((users::role.eq(role), users::updated_at.eq(Utc::now())))
            .returning(User::as_select())
            .get_result(&mut conn)?)
    }

    fn update_muted_until(&self, id: Uuid, muted_until: Option<DateTime<Utc>>) -> Result<User> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(users::table.find(id))
            .set((
                users::muted_until.eq(muted_until),
                users::updated_at.eq(Utc::now()),
            ))
            .returning(User::as_select())
            .get_result(&mut conn)?)
    }

    fn find_by_id(&self, id: Uuid) -> Result<Option<User>> {
        let mut conn = self.pool.get()?;
        Ok(users::table
            .find(id)
            .select(User::as_select())
            .first::<User>(&mut conn)
            .optional()?)
    }

    fn find_by_email(&self, email: &str) -> Result<Option<User>> {
        let mut conn = self.pool.get()?;
        Ok(users::table
            .filter(users::email.eq(email))
            .select(User::as_select())
            .first::<User>(&mut conn)
            .optional()?)
    }

    fn find_by_username(&self, username: &str) -> Result<Option<User>> {
        let mut conn = self.pool.get()?;
        Ok(users::table
            .filter(users::username.eq(username))
            .select(User::as_select())
            .first::<User>(&mut conn)
            .optional()?)
    }
}
