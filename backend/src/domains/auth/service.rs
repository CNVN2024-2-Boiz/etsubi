use std::sync::Arc;

use chrono::Utc;
use uuid::Uuid;

use crate::{
    domains::{auth::error::AuthError, user::repository::UserRepository},
    infrastructure::{
        database::models::entities::User,
        security::{
            jwt::create_token,
            password::{hash_password, verify_password},
        },
    },
};

pub struct AuthService {
    user_repo: Arc<dyn UserRepository>,
    jwt_key: String,
    jwt_expiry_hours: i64,
}

impl AuthService {
    pub fn new(user_repo: Arc<dyn UserRepository>, jwt_key: String, jwt_expiry_hours: i64) -> Self {
        Self {
            user_repo,
            jwt_key,
            jwt_expiry_hours,
        }
    }

    pub fn register(&self, username: &str, email: &str, password: &str) -> Result<User, AuthError> {
        if username.len() < 3 {
            return Err(AuthError::UsernameTooShort);
        }
        if self.user_repo.find_by_email(email)?.is_some() {
            return Err(AuthError::EmailAlreadyExists);
        }
        if self.user_repo.find_by_username(username)?.is_some() {
            return Err(AuthError::UsernameAlreadyTaken);
        }

        let hashed = hash_password(password)?;
        let now = Utc::now();
        let user = User {
            id: Uuid::nil(),
            username: username.into(),
            email: email.into(),
            school: None,
            address: None,
            password: hashed,
            avatar_url: None,
            bio: None,
            role: "user".into(),
            status: "active".into(),
            created_at: now,
            updated_at: now,
            muted_until: None,
        };

        Ok(self.user_repo.create(&user)?)
    }

    pub fn login(&self, email: &str, password: &str) -> Result<(User, String), AuthError> {
        let user = self
            .user_repo
            .find_by_email(email)?
            .ok_or(AuthError::InvalidCredentials)?;

        if !verify_password(password, &user.password) {
            return Err(AuthError::InvalidCredentials);
        }

        if user.status == "banned" {
            return Err(AuthError::AccountBanned);
        }

        let token = create_token(
            user.id,
            user.role.clone(),
            &self.jwt_key,
            self.jwt_expiry_hours,
        )?;

        Ok((user, token))
    }

    pub fn authenticate(&self, token: &str) -> Result<User, AuthError> {
        let claims = crate::infrastructure::security::jwt::verify_token(token, &self.jwt_key)
            .map_err(|_| AuthError::InvalidToken)?;

        let user = self
            .user_repo
            .find_by_id(claims.sub)?
            .ok_or(AuthError::UserNotFound)?;

        match user.status.as_str() {
            "active" => Ok(user),
            "banned" => Err(AuthError::AccountBanned),
            _ => Err(AuthError::InvalidToken),
        }
    }

    pub fn change_password(
        &self,
        user_id: Uuid,
        current_password: &str,
        new_password: &str,
    ) -> Result<(), AuthError> {
        let user = self
            .user_repo
            .find_by_id(user_id)?
            .ok_or(AuthError::UserNotFound)?;

        if !verify_password(current_password, &user.password) {
            return Err(AuthError::InvalidCredentials);
        }

        if new_password.len() < 8 {
            return Err(AuthError::WeakPassword);
        }

        let hashed = hash_password(new_password)?;
        self.user_repo.update_password(user_id, &hashed)?;
        Ok(())
    }

    pub fn delete_account(&self, user_id: Uuid, password: &str) -> Result<(), AuthError> {
        let user = self
            .user_repo
            .find_by_id(user_id)?
            .ok_or(AuthError::UserNotFound)?;

        if !verify_password(password, &user.password) {
            return Err(AuthError::InvalidCredentials);
        }

        if user.role == "admin" {
            return Err(AuthError::CannotDeleteAdmin);
        }

        self.user_repo.delete(user_id)?;
        Ok(())
    }
}
