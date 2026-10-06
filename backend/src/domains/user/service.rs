use std::sync::Arc;

use anyhow::{Result, anyhow};

use crate::{
    domains::user::repository::UserRepository,
    infrastructure::database::models::entities::User,
    infrastructure::security::password::{hash_password, verify_password},
    presentation::dto::user_dto::UpdateProfileRequest,
};

pub struct UserService {
    repo: Arc<dyn UserRepository>,
}

impl UserService {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub fn create(&self, username: &str, email: &str, password: &str) -> Result<User> {
        if username.len() < 3 {
            return Err(anyhow!("Username too short"));
        }

        if self.repo.find_by_email(email)?.is_some() {
            return Err(anyhow!("Email already exists"));
        }

        if self.repo.find_by_username(username)?.is_some() {
            return Err(anyhow!("Username already taken"));
        }

        let hashed = hash_password(password).expect("Hash password failed");
        let now = chrono::Utc::now();

        let user = User {
            id: 0,
            username: username.into(),
            email: email.into(),
            password: hashed,
            avatar_url: None,
            bio: None,
            role: "user".into(),
            status: "active".into(),
            created_at: now,
            updated_at: now,
            muted_until: None,
        };

        self.repo.create(&user)
    }

    pub fn verify_credentials(&self, email: &str, password: &str) -> Result<User> {
        let user = self
            .repo
            .find_by_email(email)?
            .ok_or_else(|| anyhow!("Invalid credentials"))?;

        if !verify_password(password, &user.password) {
            return Err(anyhow!("Invalid credentials"));
        }

        Ok(user)
    }

    pub fn get(&self, id: i64) -> Result<User> {
        self.repo
            .find_by_id(id)?
            .ok_or_else(|| anyhow!("User not found"))
    }

    pub fn find_by_email(&self, email: &str) -> Result<Option<User>> {
        self.repo.find_by_email(email)
    }

    pub fn update_profile(&self, user_id: i64, req: UpdateProfileRequest) -> Result<User> {
        let mut user = self
            .repo
            .find_by_id(user_id)?
            .ok_or_else(|| anyhow!("User not found"))?;

        if let Some(new_username) = req.username
            && new_username != user.username
        {
            if self.repo.find_by_username(&new_username)?.is_some() {
                return Err(anyhow!("Username already taken"));
            }
            user.username = new_username;
        }

        if let Some(new_email) = req.email
            && new_email != user.email
        {
            if self.repo.find_by_email(&new_email)?.is_some() {
                return Err(anyhow!("Email already taken"));
            }
            user.email = new_email;
        }

        if let Some(bio) = req.bio {
            user.bio = Some(bio);
        }

        if let Some(avatar_url) = req.avatar_url {
            user.avatar_url = Some(avatar_url);
        }

        self.repo.update_profile(&user)
    }

    pub fn update_status(&self, target_id: i64, status: &str) -> Result<User> {
        let valid = ["active", "inactive", "banned", "pending"];
        if !valid.contains(&status) {
            return Err(anyhow!("Invalid status"));
        }

        self.repo.update_status(target_id, status)
    }

    pub fn update_role(&self, target_id: i64, role: &str) -> Result<User> {
        if role == "admin" {
            return Err(anyhow!("Cannot assign admin role"));
        }

        if !matches!(role, "user" | "moderator") {
            return Err(anyhow!("Invalid role"));
        }

        self.repo.update_role(target_id, role)
    }
}
