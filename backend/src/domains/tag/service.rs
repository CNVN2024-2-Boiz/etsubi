use std::sync::Arc;

use uuid::Uuid;

use crate::{
    domains::{
        post::repository::PostRepository,
        tag::{error::TagError, repository::TagRepository},
    },
    infrastructure::database::models::entities::{Post, Tag},
};

pub struct TagService {
    repo: Arc<dyn TagRepository>,
    post_repo: Arc<dyn PostRepository>,
}

impl TagService {
    pub fn new(repo: Arc<dyn TagRepository>, post_repo: Arc<dyn PostRepository>) -> Self {
        Self { repo, post_repo }
    }

    pub fn list_all(&self) -> Result<Vec<Tag>, TagError> {
        Ok(self.repo.find_all()?)
    }

    pub fn get(&self, id: Uuid) -> Result<Tag, TagError> {
        self.repo.find_by_id(id)?.ok_or(TagError::NotFound)
    }

    /// Public: xem tag của một post đã published.
    pub fn list_by_post(&self, post_id: Uuid) -> Result<Vec<Tag>, TagError> {
        self.post_repo
            .find_published_by_id(post_id)?
            .ok_or(TagError::PostUnavailable)?;
        Ok(self.repo.list_tags_by_post(post_id)?)
    }

    /// Public: liệt kê các post published có tag.
    pub fn list_published_posts(&self, tag_id: Uuid) -> Result<Vec<Post>, TagError> {
        self.get(tag_id)?;
        let post_ids = self.repo.list_post_ids_by_tag(tag_id)?;
        if post_ids.is_empty() {
            return Ok(vec![]);
        }
        Ok(self.post_repo.find_published_by_ids(&post_ids)?)
    }

    /// Owner-only: gắn tag vào post mình.
    pub fn attach(&self, post_id: Uuid, tag_id: Uuid, requester_id: Uuid) -> Result<(), TagError> {
        self.ensure_owner(post_id, requester_id)?;

        if self.repo.find_by_id(tag_id)?.is_none() {
            return Err(TagError::NotFound);
        }
        if self.repo.is_attached(post_id, tag_id)? {
            return Err(TagError::AlreadyAttached);
        }

        Ok(self.repo.attach(post_id, tag_id)?)
    }

    /// Owner-only: bỏ tag khỏi post mình.
    pub fn detach(&self, post_id: Uuid, tag_id: Uuid, requester_id: Uuid) -> Result<(), TagError> {
        self.ensure_owner(post_id, requester_id)?;

        if !self.repo.is_attached(post_id, tag_id)? {
            return Err(TagError::NotAttached);
        }

        Ok(self.repo.detach(post_id, tag_id)?)
    }

    fn ensure_owner(&self, post_id: Uuid, requester_id: Uuid) -> Result<(), TagError> {
        let post = self
            .post_repo
            .find_by_id(post_id)?
            .ok_or(TagError::PostUnavailable)?;

        if post.deleted_at.is_some() {
            return Err(TagError::PostUnavailable);
        }
        if post.author_id != requester_id {
            return Err(TagError::Forbidden);
        }
        Ok(())
    }
}
