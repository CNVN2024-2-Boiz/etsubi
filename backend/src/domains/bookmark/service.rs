use std::sync::Arc;

use uuid::Uuid;

use crate::{
    domains::{
        bookmark::{error::BookmarkError, repository::BookmarkRepository},
        post::repository::PostRepository,
    },
    infrastructure::database::models::{entities::Post, relations::bookmark::Bookmark},
};

pub struct BookmarkService {
    repo: Arc<dyn BookmarkRepository>,
    post_repo: Arc<dyn PostRepository>,
}

impl BookmarkService {
    pub fn new(repo: Arc<dyn BookmarkRepository>, post_repo: Arc<dyn PostRepository>) -> Self {
        Self { repo, post_repo }
    }

    pub fn add(&self, user_id: Uuid, post_id: Uuid) -> Result<Bookmark, BookmarkError> {
        self.post_repo
            .find_published_by_id(post_id)?
            .ok_or(BookmarkError::PostUnavailable)?;

        if self.repo.find_by_user_and_post(user_id, post_id)?.is_some() {
            return Err(BookmarkError::AlreadyBookmarked);
        }

        Ok(self.repo.create(user_id, post_id)?)
    }

    pub fn remove(&self, user_id: Uuid, post_id: Uuid) -> Result<(), BookmarkError> {
        if self.repo.find_by_user_and_post(user_id, post_id)?.is_none() {
            return Err(BookmarkError::NotFound);
        }
        Ok(self.repo.delete(user_id, post_id)?)
    }

    pub fn list_my(&self, user_id: Uuid) -> Result<Vec<Post>, BookmarkError> {
        Ok(self.repo.list_bookmarked_posts(user_id)?)
    }

    pub fn is_bookmarked(&self, user_id: Uuid, post_id: Uuid) -> Result<bool, BookmarkError> {
        Ok(self.repo.find_by_user_and_post(user_id, post_id)?.is_some())
    }
}
