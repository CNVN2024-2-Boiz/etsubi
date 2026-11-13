use std::sync::Arc;

use chrono::Utc;
use uuid::Uuid;

use crate::{
    domains::{
        auth::{error::AuthError, repository::AuthRepository},
        user::repository::UserRepository,
    },
    infrastructure::{
        database::models::entities::User,
        helper::auth::{
            jwt::create_token,
            password::{hash_password, verify_password},
        },
    },
};

const MIN_USERNAME_LEN: usize = 3;
const MIN_PASSWORD_LEN: usize = 8;
const VALID_LANGUAGES: &[&str] = &["vi", "en", "ja"];

pub struct AuthService {
    auth_repo: Arc<dyn AuthRepository>,
    user_repo: Arc<dyn UserRepository>,
    jwt_key: String,
    jwt_expiry_hours: i64,
}

impl AuthService {
    pub fn new(
        auth_repo: Arc<dyn AuthRepository>,
        user_repo: Arc<dyn UserRepository>,
        jwt_key: String,
        jwt_expiry_hours: i64,
    ) -> Self {
        Self {
            auth_repo,
            user_repo,
            jwt_key,
            jwt_expiry_hours,
        }
    }

    pub fn register(
        &self,
        username: &str,
        email: &str,
        native: &str,
        language: &str,
        password: &str,
    ) -> Result<User, AuthError> {
        if username.len() < MIN_USERNAME_LEN {
            return Err(AuthError::UsernameTooShort);
        }
        if password.len() < MIN_PASSWORD_LEN {
            return Err(AuthError::WeakPassword);
        }
        if !VALID_LANGUAGES.contains(&native) {
            return Err(AuthError::InvalidLanguage);
        }
        if !VALID_LANGUAGES.contains(&language) {
            return Err(AuthError::InvalidLanguage);
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
            institute: None,
            address: None,
            password: hashed,
            native: native.into(),
            language: language.into(),
            avatar_url: None,
            bio: None,
            role: "user".into(),
            status: "active".into(),
            created_at: now,
            updated_at: now,
            muted_until: None,
            token_version: 0,
        };

        Ok(self.auth_repo.create(&user)?)
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
            user.token_version,
            &self.jwt_key,
            self.jwt_expiry_hours,
        )?;

        Ok((user, token))
    }

    pub fn authenticate(&self, token: &str) -> Result<User, AuthError> {
        let claims = crate::infrastructure::helper::auth::jwt::verify_token(token, &self.jwt_key)
            .map_err(|_| AuthError::InvalidToken)?;

        let user = self
            .user_repo
            .find_by_id(claims.sub)?
            .ok_or(AuthError::UserNotFound)?;

        if claims.ver != user.token_version {
            return Err(AuthError::InvalidToken);
        }

        match user.status.as_str() {
            "active" => Ok(user),
            "banned" => Err(AuthError::AccountBanned),
            _ => Err(AuthError::InvalidToken),
        }
    }

    pub fn logout(&self, user_id: Uuid) -> Result<(), AuthError> {
        self.user_repo
            .find_by_id(user_id)?
            .ok_or(AuthError::UserNotFound)?;

        self.auth_repo.increment_token_version(user_id)?;
        Ok(())
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

        if new_password.len() < MIN_PASSWORD_LEN {
            return Err(AuthError::WeakPassword);
        }

        let hashed = hash_password(new_password)?;
        self.auth_repo.update_password(user_id, &hashed)?;
        self.auth_repo.increment_token_version(user_id)?;
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

        self.auth_repo.delete(user_id)?;
        Ok(())
    }
}
