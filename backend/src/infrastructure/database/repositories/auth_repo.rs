use anyhow::Result;
use chrono::Utc;
use diesel::prelude::*;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::auth::repository::AuthRepository,
    infrastructure::database::{
        models::entities::{NewUser, User},
        schema::users,
    },
};

pub struct PostgresAuthRepo {
    pool: DbPool,
}

impl PostgresAuthRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl AuthRepository for PostgresAuthRepo {
    fn create(&self, user: &User) -> Result<User> {
        let mut conn = self.pool.get()?;

        let new_user = NewUser {
            username: &user.username,
            email: &user.email,
            password: &user.password,
            role: &user.role,
            status: &user.status,
        };

        Ok(diesel::insert_into(users::table)
            .values(&new_user)
            .get_result::<User>(&mut conn)?)
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

    fn update_password(&self, id: Uuid, hashed_password: &str) -> Result<User> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(users::table.find(id))
            .set((
                users::password.eq(hashed_password),
                users::updated_at.eq(Utc::now()),
            ))
            .get_result(&mut conn)?)
    }

    fn delete(&self, id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;
        diesel::delete(users::table.find(id)).execute(&mut conn)?;
        Ok(())
    }
}
