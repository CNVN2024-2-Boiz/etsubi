use std::sync::Arc;

use uuid::Uuid;

use crate::{
    domains::language::{error::LanguageError, repository::LanguageRepository},
    infrastructure::database::models::entities::Language,
};

pub struct LanguageService {
    repo: Arc<dyn LanguageRepository>,
}

impl LanguageService {
    pub fn new(repo: Arc<dyn LanguageRepository>) -> Self {
        Self { repo }
    }

    pub fn list_all(&self) -> Result<Vec<Language>, LanguageError> {
        Ok(self.repo.find_all()?)
    }

    pub fn get(&self, id: Uuid) -> Result<Language, LanguageError> {
        self.repo.find_by_id(id)?.ok_or(LanguageError::NotFound)
    }

    pub fn list_by_user(&self, user_id: Uuid) -> Result<Vec<Language>, LanguageError> {
        Ok(self.repo.list_by_user(user_id)?)
    }

    pub fn add(&self, user_id: Uuid, language_id: Uuid) -> Result<(), LanguageError> {
        if self.repo.find_by_id(language_id)?.is_none() {
            return Err(LanguageError::NotFound);
        }
        if self.repo.is_speaking(user_id, language_id)? {
            return Err(LanguageError::AlreadyAdded);
        }
        Ok(self.repo.add_speak(user_id, language_id)?)
    }

    pub fn remove(&self, user_id: Uuid, language_id: Uuid) -> Result<(), LanguageError> {
        if !self.repo.is_speaking(user_id, language_id)? {
            return Err(LanguageError::NotAdded);
        }
        Ok(self.repo.remove_speak(user_id, language_id)?)
    }
}
