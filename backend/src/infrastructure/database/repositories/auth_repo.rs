use anyhow::Result;
use chrono::Utc;
use diesel::prelude::*;
use uuid::Uuid;

use crate::{
    bootstrap::pool::DbPool,
    domains::auth::repository::AuthRepository,
    infrastructure::database::{
        models::entities::{ConsentRecord, NewConsent, NewConsentRow, NewUser, User},
        schema::{consent_records, users},
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
    fn create(&self, user: &User, consents: &[NewConsent]) -> Result<User> {
        let mut conn = self.pool.get()?;

        let new_user = NewUser {
            displayname: &user.displayname,
            username: &user.username,
            email: &user.email,
            password: user.password.as_deref(),
            native: &user.native,
            language: &user.language,
            role: &user.role,
            status: &user.status,
            oauth_provider: user.oauth_provider.as_deref(),
            oauth_subject: user.oauth_subject.as_deref(),
            profile_completed_at: user.profile_completed_at,
        };

        // Tài khoản và bằng chứng đồng ý phải cùng thành công hoặc cùng thất bại.
        conn.transaction::<User, anyhow::Error, _>(|conn| {
            let created = diesel::insert_into(users::table)
                .values(&new_user)
                .returning(User::as_select())
                .get_result::<User>(conn)?;

            let rows: Vec<NewConsentRow> = consents
                .iter()
                .map(|c| NewConsentRow {
                    user_id: created.id,
                    purpose: &c.purpose,
                    document_version: &c.document_version,
                    ip_address: c.ip_address.as_deref(),
                    user_agent: c.user_agent.as_deref(),
                })
                .collect();
            if !rows.is_empty() {
                diesel::insert_into(consent_records::table)
                    .values(&rows)
                    .execute(conn)?;
            }

            Ok(created)
        })
    }

    fn update_password(&self, id: Uuid, hashed_password: &str) -> Result<User> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(users::table.find(id))
            .set((
                users::password.eq(Some(hashed_password)),
                users::updated_at.eq(Utc::now()),
            ))
            .returning(User::as_select())
            .get_result(&mut conn)?)
    }

    fn increment_token_version(&self, id: Uuid) -> Result<i32> {
        let mut conn = self.pool.get()?;

        Ok(diesel::update(users::table.find(id))
            .set((
                users::token_version.eq(users::token_version + 1),
                users::updated_at.eq(Utc::now()),
            ))
            .returning(users::token_version)
            .get_result::<i32>(&mut conn)?)
    }

    fn delete(&self, id: Uuid) -> Result<()> {
        let mut conn = self.pool.get()?;
        diesel::delete(users::table.find(id)).execute(&mut conn)?;
        Ok(())
    }

    fn activate(&self, id: Uuid) -> Result<bool> {
        let mut conn = self.pool.get()?;
        let n = diesel::update(users::table.find(id).filter(users::status.eq("pending")))
            .set((users::status.eq("active"), users::updated_at.eq(Utc::now())))
            .execute(&mut conn)?;
        Ok(n == 1)
    }

    fn list_consents(&self, user_id: Uuid) -> Result<Vec<ConsentRecord>> {
        let mut conn = self.pool.get()?;
        Ok(consent_records::table
            .filter(consent_records::user_id.eq(user_id))
            .order(consent_records::granted_at.desc())
            .select(ConsentRecord::as_select())
            .load(&mut conn)?)
    }
}
