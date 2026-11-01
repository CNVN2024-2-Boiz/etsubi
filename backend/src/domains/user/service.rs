use std::sync::Arc;

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    domains::user::{error::UserError, repository::UserRepository},
    infrastructure::database::models::entities::User,
};

const MIN_USERNAME_LEN: usize = 3;
const VALID_LANGUAGES: &[&str] = &["vi", "en", "ja"];

pub struct UserService {
    user_repo: Arc<dyn UserRepository>,
}

impl UserService {
    pub fn new(user_repo: Arc<dyn UserRepository>) -> Self {
        Self { user_repo }
    }

    pub fn get(&self, id: Uuid) -> Result<User, UserError> {
        self.user_repo.find_by_id(id)?.ok_or(UserError::NotFound)
    }

    pub fn find_by_email(&self, email: &str) -> Result<Option<User>, UserError> {
        Ok(self.user_repo.find_by_email(email)?)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn update_profile(
        &self,
        target_id: Uuid,
        requester_id: Uuid,
        username: Option<String>,
        email: Option<String>,
        language: Option<String>,
        school: Option<String>,
        address: Option<String>,
        bio: Option<String>,
        avatar_url: Option<String>,
    ) -> Result<User, UserError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(UserError::NotFound)?;

        if requester.id != target_id {
            return Err(UserError::ForbiddenProfileEdit);
        }

        let mut user = self
            .user_repo
            .find_by_id(target_id)?
            .ok_or(UserError::NotFound)?;

        if let Some(new_username) = username
            && new_username != user.username
        {
            if new_username.len() < MIN_USERNAME_LEN {
                return Err(UserError::UsernameTooShort);
            }
            if self.user_repo.find_by_username(&new_username)?.is_some() {
                return Err(UserError::UsernameAlreadyTaken);
            }
            user.username = new_username;
        }

        if let Some(new_email) = email
            && new_email != user.email
        {
            if self.user_repo.find_by_email(&new_email)?.is_some() {
                return Err(UserError::EmailAlreadyTaken);
            }
            user.email = new_email;
        }

        if let Some(school) = school {
            user.school = Some(school);
        }

        if let Some(address) = address {
            user.address = Some(address);
        }

        if let Some(language) = language {
            if !VALID_LANGUAGES.contains(&language.as_str()) {
                return Err(UserError::InvalidLanguage);
            }
            user.language = language;
        }

        if let Some(bio) = bio {
            user.bio = Some(bio);
        }

        if let Some(avatar_url) = avatar_url {
            user.avatar_url = Some(avatar_url);
        }

        Ok(self.user_repo.update_profile(&user)?)
    }

    pub fn update_status(
        &self,
        target_id: Uuid,
        requester_id: Uuid,
        status: &str,
    ) -> Result<User, UserError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(UserError::NotFound)?;

        let target = self
            .user_repo
            .find_by_id(target_id)?
            .ok_or(UserError::NotFound)?;

        let valid = ["active", "banned"];

        if !valid.contains(&status) {
            return Err(UserError::InvalidStatus);
        }

        if !matches!(requester.role.as_str(), "moderator" | "admin") {
            return Err(UserError::RequiresStaff);
        }

        let can_modify = match requester.role.as_str() {
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

        Ok(self.user_repo.update_status(target_id, status)?)
    }

    pub fn update_role(
        &self,
        target_id: Uuid,
        requester_id: Uuid,
        new_role: &str,
    ) -> Result<User, UserError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(UserError::NotFound)?;

        let target = self
            .user_repo
            .find_by_id(target_id)?
            .ok_or(UserError::NotFound)?;

        if new_role == "admin" {
            return Err(UserError::CannotAssignAdminRole);
        }

        if !matches!(new_role, "user" | "moderator") {
            return Err(UserError::InvalidRole);
        }

        if requester.role.as_str() != "admin" {
            return Err(UserError::RequiresAdmin);
        }

        if target.id == requester_id {
            return Err(UserError::CannotChangeOwnRole);
        }

        if target.role.as_str() == "admin" {
            return Err(UserError::CannotModifyHigherRole);
        }

        Ok(self.user_repo.update_role(target_id, new_role)?)
    }

    pub fn update_mute(
        &self,
        target_id: Uuid,
        requester_id: Uuid,
        muted_until: Option<DateTime<Utc>>,
    ) -> Result<User, UserError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(UserError::NotFound)?;

        let target = self
            .user_repo
            .find_by_id(target_id)?
            .ok_or(UserError::NotFound)?;

        if !matches!(requester.role.as_str(), "moderator" | "admin") {
            return Err(UserError::RequiresStaff);
        }

        let can_modify = match requester.role.as_str() {
            "admin" => target.role != "admin",
            "moderator" => target.role == "user",
            _ => false,
        };

        if !can_modify {
            return Err(UserError::CannotModifyHigherRole);
        }

        // Only disallow self-mute (setting a future mute on yourself);
        // self-unmute is a no-op but harmless.
        if target_id == requester_id && muted_until.is_some() {
            return Err(UserError::CannotMuteSelf);
        }

        Ok(self.user_repo.update_muted_until(target_id, muted_until)?)
    }
}
