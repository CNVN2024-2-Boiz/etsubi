use anyhow::Result;
use chrono::Utc;
use diesel::prelude::*;

use crate::{
    bootstrap::pool::DbPool,
    infrastructure::database::{
        models::entities::{NewUser, User},
        schema::users,
    },
    modules::user::repository::UserRepository,
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
    fn create(&self, user: &User) -> Result<User> {
        let mut conn = self.pool.get()?;

        let new_user = NewUser {
            username: &user.username,
            email: &user.email,
            password: &user.password,
            status: &user.status,
        };

        Ok(diesel::insert_into(users::table)
            .values(&new_user)
            .get_result::<User>(&mut conn)?)
    }

    fn update(&self, user: &User) -> Result<User> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(users::table.find(user.id))
            .set((
                users::username.eq(&user.username),
                users::email.eq(&user.email),
                users::password.eq(&user.password),
                users::avatar_url.eq(&user.avatar_url),
                users::bio.eq(&user.bio),
                users::status.eq(&user.status),
                users::muted_until.eq(&user.muted_until),
                users::updated_at.eq(Utc::now()),
            ))
            .get_result::<User>(&mut conn)?)
    }

    fn delete(&self, id: i64) -> Result<()> {
        let mut conn = self.pool.get()?;
        diesel::delete(users::table.find(id)).execute(&mut conn)?;
        Ok(())
    }

    fn find_by_id(&self, id: i64) -> Result<Option<User>> {
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
