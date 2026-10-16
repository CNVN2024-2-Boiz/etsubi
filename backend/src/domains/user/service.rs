use std::sync::Arc;

use uuid::Uuid;

use crate::{
    domains::user::{error::UserError, repository::UserRepository},
    infrastructure::database::models::entities::User,
    infrastructure::security::{
        jwt::{PURPOSE_VERIFY, create_token, verify_token},
        password::{hash_password, verify_password},
    },
};

pub struct UserService {
    repo: Arc<dyn UserRepository>,
}

impl UserService {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub fn create(&self, username: &str, email: &str, password: &str) -> Result<User, UserError> {
        if username.len() < 3 {
            return Err(UserError::UsernameTooShort);
        }

        if self.repo.find_by_email(email)?.is_some() {
            return Err(UserError::EmailAlreadyExists);
        }

        if self.repo.find_by_username(username)?.is_some() {
            return Err(UserError::UsernameAlreadyTaken);
        }

        let hashed = hash_password(password)?;

        let now = chrono::Utc::now();
        let user = User {
            id: Uuid::nil(),
            username: username.into(),
            email: email.into(),
            password: hashed,
            avatar_url: None,
            bio: None,
            role: "user".into(),
            status: "pending".into(),
            created_at: now,
            updated_at: now,
            muted_until: None,
        };

        Ok(self.repo.create(&user)?)
    }

    pub fn verify_credentials(&self, email: &str, password: &str) -> Result<User, UserError> {
        let user = self
            .repo
            .find_by_email(email)?
            .ok_or(UserError::InvalidCredentials)?;

        if !verify_password(password, &user.password) {
            return Err(UserError::InvalidCredentials);
        }

        match user.status.as_str() {
            "active" => Ok(user),
            "pending" => Err(UserError::AccountNotVerified),
            "banned" => Err(UserError::AccountBanned),
            _ => Err(UserError::InvalidCredentials),
        }
    }

    pub fn get(&self, id: Uuid) -> Result<User, UserError> {
        self.repo.find_by_id(id)?.ok_or(UserError::NotFound)
    }

    pub fn find_by_email(&self, email: &str) -> Result<Option<User>, UserError> {
        Ok(self.repo.find_by_email(email)?)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn update_profile(
        &self,
        target_id: Uuid,
        requester_id: Uuid,
        username: Option<String>,
        email: Option<String>,
        bio: Option<String>,
        avatar_url: Option<String>,
    ) -> Result<User, UserError> {
        let is_self = target_id == requester_id;

        if !is_self {
            return Err(UserError::ForbiddenProfileEdit);
        }

        let mut user = self
            .repo
            .find_by_id(target_id)?
            .ok_or(UserError::NotFound)?;

        if let Some(new_username) = username
            && new_username != user.username
        {
            if self.repo.find_by_username(&new_username)?.is_some() {
                return Err(UserError::UsernameAlreadyTaken);
            }
            user.username = new_username;
        }

        if let Some(new_email) = email
            && new_email != user.email
        {
            if self.repo.find_by_email(&new_email)?.is_some() {
                return Err(UserError::EmailAlreadyTaken);
            }
            user.email = new_email;
        }

        if let Some(bio) = bio {
            user.bio = Some(bio);
        }

        if let Some(avatar_url) = avatar_url {
            user.avatar_url = Some(avatar_url);
        }

        Ok(self.repo.update_profile(&user)?)
    }

    pub fn update_status(
        &self,
        target_id: Uuid,
        requester_id: Uuid,
        requester_role: &str,
        status: &str,
    ) -> Result<User, UserError> {
        let valid = ["active", "banned", "pending"];
        if !valid.contains(&status) {
            return Err(UserError::InvalidStatus);
        }

        if !matches!(requester_role, "moderator" | "admin") {
            return Err(UserError::RequiresStaff);
        }

        let target = self
            .repo
            .find_by_id(target_id)?
            .ok_or(UserError::NotFound)?;

        let can_modify = match requester_role {
            "admin" => target.role != "admin",
            "moderator" => target.role == "user",
            _ => false,
        };

        if !can_modify {
            return Err(UserError::CannotModifyHigherRole);
        }

        if target_id == requester_id && status == "banned" {
            return Err(UserError::CannotBanSelf);
        }

        Ok(self.repo.update_status(target_id, status)?)
    }

    pub fn update_role(
        &self,
        target_id: Uuid,
        requester_id: Uuid,
        requester_role: &str,
        new_role: &str,
    ) -> Result<User, UserError> {
        if new_role == "admin" {
            return Err(UserError::CannotAssignAdminRole);
        }
        if !matches!(new_role, "user" | "moderator") {
            return Err(UserError::InvalidRole);
        }

        if requester_role != "admin" {
            return Err(UserError::RequiresAdmin);
        }

        if target_id == requester_id {
            return Err(UserError::CannotChangeOwnRole);
        }

        let target = self
            .repo
            .find_by_id(target_id)?
            .ok_or(UserError::NotFound)?;

        if target.role == "admin" {
            return Err(UserError::CannotModifyHigherRole);
        }

        Ok(self.repo.update_role(target_id, new_role)?)
    }

    pub fn verify_email(&self, token: &str, jwt_key: &str) -> Result<Uuid, UserError> {
        let claims =
            verify_token(token, jwt_key, PURPOSE_VERIFY).map_err(|_| UserError::InvalidToken)?;

        let user = self
            .repo
            .find_by_id(claims.sub)?
            .ok_or(UserError::InvalidToken)?;

        match user.status.as_str() {
            "pending" => {}
            "active" => return Err(UserError::AlreadyVerified),
            _ => return Err(UserError::InvalidToken),
        }

        self.repo.update_status(user.id, "active")?;
        Ok(user.id)
    }

    pub fn resend_verification(
        &self,
        email: &str,
        jwt_key: &str,
    ) -> Result<Option<(String, String)>, UserError> {
        let Some(user) = self.repo.find_by_email(email)? else {
            return Ok(None);
        };

        if user.status != "pending" {
            return Ok(None);
        }

        let token = create_token(user.id, String::new(), PURPOSE_VERIFY, jwt_key, 24)?;
        Ok(Some((user.email, token)))
    }
}
