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
            language: &user.language,
            role: &user.role,
            status: &user.status,
        };

        Ok(diesel::insert_into(users::table)
            .values(&new_user)
            .returning(User::as_select())
            .get_result::<User>(&mut conn)?)
    }

    fn update_password(&self, id: Uuid, hashed_password: &str) -> Result<User> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(users::table.find(id))
            .set((
                users::password.eq(hashed_password),
                users::updated_at.eq(Utc::now()),
            ))
            .returning(User::as_select())
            .get_result(&mut conn)?)
    }

    fn delete(&self, id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;
        diesel::delete(users::table.find(id)).execute(&mut conn)?;
        Ok(())
    }
}
