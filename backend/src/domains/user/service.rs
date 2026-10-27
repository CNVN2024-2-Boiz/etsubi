use std::sync::Arc;

use uuid::Uuid;

use crate::{
    domains::user::{error::UserError, repository::UserRepository},
    infrastructure::database::models::entities::User,
};

pub struct UserService {
    repo: Arc<dyn UserRepository>,
}

impl UserService {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
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
        school: Option<String>,
        address: Option<String>,
        bio: Option<String>,
        avatar_url: Option<String>,
    ) -> Result<User, UserError> {
        if target_id != requester_id {
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

        if let Some(school) = school {
            user.school = Some(school);
        }
        if let Some(address) = address {
            user.address = Some(address);
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
        let valid = ["active", "banned"];
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
}
