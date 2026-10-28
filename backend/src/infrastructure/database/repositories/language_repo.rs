use anyhow::Result;
use diesel::prelude::*;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::language::repository::LanguageRepository,
    infrastructure::database::{
        models::{entities::Language, relations::speak::NewSpeak},
        schema::{languages, speaks},
    },
};

pub struct PostgresLanguageRepo {
    pool: DbPool,
}

impl PostgresLanguageRepo {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

impl LanguageRepository for PostgresLanguageRepo {
    fn find_all(&self) -> Result<Vec<Language>> {
        let mut conn = self.pool.get()?;
        Ok(languages::table
            .order(languages::name.asc())
            .select(Language::as_select())
            .load(&mut conn)?)
    }

    fn find_by_id(&self, id: Uuid) -> Result<Option<Language>> {
        let mut conn = self.pool.get()?;
        Ok(languages::table
            .find(id)
            .select(Language::as_select())
            .first(&mut conn)
            .optional()?)
    }

    fn find_by_code(&self, code: &str) -> Result<Option<Language>> {
        let mut conn = self.pool.get()?;
        Ok(languages::table
            .filter(languages::code.eq(code))
            .select(Language::as_select())
            .first(&mut conn)
            .optional()?)
    }

    fn list_by_user(&self, user_id: Uuid) -> Result<Vec<Language>> {
        let mut conn = self.pool.get()?;
        let ids: Vec<Uuid> = speaks::table
            .filter(speaks::user_id.eq(user_id))
            .select(speaks::language_id)
            .load(&mut conn)?;
        if ids.is_empty() {
            return Ok(vec![]);
        }
        Ok(languages::table
            .filter(languages::id.eq_any(&ids))
            .order(languages::name.asc())
            .select(Language::as_select())
            .load(&mut conn)?)
    }

    fn add_speak(&self, user_id: Uuid, language_id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;
        let new = NewSpeak {
            user_id,
            language_id,
        };
        diesel::insert_into(speaks::table)
            .values(&new)
            .execute(&mut conn)?;
        Ok(())
    }

    fn remove_speak(&self, user_id: Uuid, language_id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;
        diesel::delete(
            speaks::table
                .filter(speaks::user_id.eq(user_id))
                .filter(speaks::language_id.eq(language_id)),
        )
        .execute(&mut conn)?;
        Ok(())
    }

    fn is_speaking(&self, user_id: Uuid, language_id: Uuid) -> Result<bool> {
        let mut conn = self.pool.get()?;
        let count: i64 = speaks::table
            .filter(speaks::user_id.eq(user_id))
            .filter(speaks::language_id.eq(language_id))
            .count()
            .get_result(&mut conn)?;
        Ok(count > 0)
    }
}
