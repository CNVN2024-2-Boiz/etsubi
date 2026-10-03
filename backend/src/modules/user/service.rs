use std::sync::Arc;

use anyhow::{Result, anyhow};

use crate::{
    infrastructure::database::models::entities::User, modules::user::repository::UserRepository,
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

        let hashed = format!("hashed_{}", password);
        let now = chrono::Utc::now();

        let user = User {
            id: 0,
            username: username.into(),
            email: email.into(),
            password: hashed,
            avatar_url: None,
            bio: None,
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

        if user.password != format!("hashed_{}", password) {
            return Err(anyhow!("Invalid credentials"));
        }

        Ok(user)
    }

    pub fn get(&self, id: i64) -> Result<User> {
        self.repo
            .find_by_id(id)?
            .ok_or_else(|| anyhow!("User not found"))
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

        self.repo.update(&user)
    }

    pub fn update_status(&self, target_id: i64, status: &str) -> Result<User> {
        let valid = ["active", "inactive", "banned", "pending"];
        if !valid.contains(&status) {
            return Err(anyhow!("Invalid status"));
        }

        let mut user = self
            .repo
            .find_by_id(target_id)?
            .ok_or_else(|| anyhow!("User not found"))?;

        user.status = status.to_string();
        self.repo.update(&user)
    }
}
