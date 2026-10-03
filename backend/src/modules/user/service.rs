use anyhow::{Result, anyhow};
use std::sync::Arc;

use crate::{
    infrastructure::database::models::entities::User, modules::user::repository::UserRepository,
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

    pub fn get(&self, id: i64) -> Result<User> {
        self.repo
            .find_by_id(id)?
            .ok_or_else(|| anyhow!("User not found"))
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
}
