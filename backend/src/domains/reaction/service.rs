use std::sync::Arc;

use uuid::Uuid;

use crate::{
    domains::{
        post::repository::PostRepository,
        reaction::{error::ReactionError, repository::ReactionRepository},
    },
    infrastructure::database::models::relations::reaction::Reaction,
};

const MAX_EMOJI_CHARS: usize = 32;

pub struct ReactionService {
    repo: Arc<dyn ReactionRepository>,
    post_repo: Arc<dyn PostRepository>,
}

impl ReactionService {
    pub fn new(repo: Arc<dyn ReactionRepository>, post_repo: Arc<dyn PostRepository>) -> Self {
        Self { repo, post_repo }
    }

    fn ensure_post_available(&self, post_id: Uuid) -> Result<(), ReactionError> {
        self.post_repo
            .find_published_by_id(post_id)?
            .ok_or(ReactionError::PostUnavailable)?;
        Ok(())
    }

    pub fn upsert(
        &self,
        user_id: Uuid,
        post_id: Uuid,
        emoji: &str,
    ) -> Result<Reaction, ReactionError> {
        let emoji = emoji.trim();
        if emoji.is_empty() {
            return Err(ReactionError::EmptyEmoji);
        }
        if emoji.chars().count() > MAX_EMOJI_CHARS {
            return Err(ReactionError::EmojiTooLong);
        }

        self.ensure_post_available(post_id)?;
        Ok(self.repo.upsert(user_id, post_id, emoji)?)
    }

    pub fn remove(&self, user_id: Uuid, post_id: Uuid) -> Result<(), ReactionError> {
        if self.repo.find_by_user_and_post(user_id, post_id)?.is_none() {
            return Err(ReactionError::NotFound);
        }
        Ok(self.repo.delete(user_id, post_id)?)
    }

    pub fn get_mine(&self, user_id: Uuid, post_id: Uuid) -> Result<Reaction, ReactionError> {
        self.repo
            .find_by_user_and_post(user_id, post_id)?
            .ok_or(ReactionError::NotFound)
    }

    pub fn list_by_post(&self, post_id: Uuid) -> Result<Vec<Reaction>, ReactionError> {
        self.ensure_post_available(post_id)?;
        Ok(self.repo.list_by_post(post_id)?)
    }

    pub fn summary_by_post(&self, post_id: Uuid) -> Result<Vec<(String, i64)>, ReactionError> {
        self.ensure_post_available(post_id)?;
        Ok(self.repo.summary_by_post(post_id)?)
    }
}
