use std::sync::Arc;

use chrono::Utc;
use uuid::Uuid;

use crate::{
    domains::{
        comment::{error::CommentError, repository::CommentRepository},
        post::repository::PostRepository,
    },
    infrastructure::database::models::entities::Comment,
};

pub struct CommentService {
    repo: Arc<dyn CommentRepository>,
    post_repo: Arc<dyn PostRepository>,
}

impl CommentService {
    pub fn new(repo: Arc<dyn CommentRepository>, post_repo: Arc<dyn PostRepository>) -> Self {
        Self { repo, post_repo }
    }

    fn ensure_post_mutable(&self, post_id: Uuid) -> Result<(), CommentError> {
        let post = self
            .post_repo
            .find_by_id(post_id)?
            .ok_or(CommentError::PostUnavailable)?;

        if post.deleted_at.is_some() || post.status != "published" {
            return Err(CommentError::PostUnavailable);
        }
        if post.comments_locked {
            return Err(CommentError::PostLocked);
        }
        Ok(())
    }

    fn ensure_post_readable(&self, post_id: Uuid) -> Result<(), CommentError> {
        let post = self
            .post_repo
            .find_by_id(post_id)?
            .ok_or(CommentError::PostUnavailable)?;

        if post.deleted_at.is_some() || post.status != "published" {
            return Err(CommentError::PostUnavailable);
        }
        Ok(())
    }

    pub fn create(
        &self,
        requester_id: Uuid,
        post_id: Uuid,
        parent_id: Option<Uuid>,
        content: &str,
    ) -> Result<Comment, CommentError> {
        let content = content.trim();
        if content.is_empty() {
            return Err(CommentError::EmptyContent);
        }
        if content.len() > 10_000 {
            return Err(CommentError::ContentTooLong);
        }

        self.ensure_post_mutable(post_id)?;

        if let Some(parent_id) = parent_id {
            let parent = self
                .repo
                .find_by_id(parent_id)?
                .ok_or(CommentError::ParentUnavailable)?;

            if parent.post_id != post_id
                || parent.deleted_at.is_some()
                || parent.status != "visible"
            {
                return Err(CommentError::ParentUnavailable);
            }
        }

        let now = Utc::now();
        let comment = Comment {
            id: Uuid::nil(),
            parent_id,
            post_id,
            user_id: requester_id,
            content: content.to_string(),
            status: "visible".into(),
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };

        Ok(self.repo.create(&comment)?)
    }

    fn get_active(&self, id: Uuid) -> Result<Comment, CommentError> {
        let comment = self.repo.find_by_id(id)?.ok_or(CommentError::NotFound)?;
        if comment.deleted_at.is_some() {
            return Err(CommentError::NotFound);
        }
        Ok(comment)
    }

    pub fn get_any(&self, id: Uuid, requester_role: &str) -> Result<Comment, CommentError> {
        if !matches!(requester_role, "moderator" | "admin") {
            return Err(CommentError::RequiresStaff);
        }

        self.repo.find_by_id(id)?.ok_or(CommentError::NotFound)
    }

    pub fn update_content(
        &self,
        id: Uuid,
        requester_id: Uuid,
        content: &str,
    ) -> Result<Comment, CommentError> {
        let mut comment = self.get_active(id)?;

        self.ensure_post_mutable(comment.post_id)?;

        if comment.user_id != requester_id {
            return Err(CommentError::Forbidden);
        }

        let content = content.trim();
        if content.is_empty() {
            return Err(CommentError::EmptyContent);
        }
        if content.len() > 10_000 {
            return Err(CommentError::ContentTooLong);
        }

        comment.content = content.to_string();
        comment.updated_at = Utc::now();

        Ok(self.repo.update_content(&comment)?)
    }

    pub fn update_status(
        &self,
        id: Uuid,
        requester_role: &str,
        status: &str,
    ) -> Result<Comment, CommentError> {
        if !matches!(requester_role, "moderator" | "admin") {
            return Err(CommentError::RequiresStaff);
        }

        if !matches!(status, "visible" | "hidden") {
            return Err(CommentError::InvalidStatus);
        }

        let comment = self.get_active(id)?;
        Ok(self.repo.update_status(comment.id, status)?)
    }

    pub fn delete(
        &self,
        id: Uuid,
        requester_id: Uuid,
        requester_role: &str,
    ) -> Result<(), CommentError> {
        let comment = self.get_active(id)?;

        self.ensure_post_mutable(comment.post_id)?;

        let is_owner = comment.user_id == requester_id;
        let is_staff = matches!(requester_role, "moderator" | "admin");

        if !is_owner && !is_staff {
            return Err(CommentError::Forbidden);
        }

        self.repo.delete(id)?;
        Ok(())
    }

    pub fn restore(&self, id: Uuid, requester_role: &str) -> Result<Comment, CommentError> {
        if !matches!(requester_role, "moderator" | "admin") {
            return Err(CommentError::RequiresStaff);
        }

        let comment = self.repo.find_by_id(id)?.ok_or(CommentError::NotFound)?;
        if comment.deleted_at.is_none() {
            return Err(CommentError::NotFound);
        }

        Ok(self.repo.restore(id)?)
    }

    pub fn list_visible_by_post(&self, post_id: Uuid) -> Result<Vec<Comment>, CommentError> {
        self.ensure_post_readable(post_id)?;
        Ok(self.repo.find_visible_by_post(post_id)?)
    }

    pub fn list_all_by_post(
        &self,
        post_id: Uuid,
        requester_role: &str,
    ) -> Result<Vec<Comment>, CommentError> {
        if !matches!(requester_role, "moderator" | "admin") {
            return Err(CommentError::RequiresStaff);
        }

        Ok(self.repo.find_by_post(post_id)?)
    }

    pub fn list_my_comments(&self, author_id: Uuid) -> Result<Vec<Comment>, CommentError> {
        Ok(self.repo.find_by_author(author_id)?)
    }

    pub fn get_visible(&self, id: Uuid) -> Result<Comment, CommentError> {
        let comment = self.repo.find_by_id(id)?.ok_or(CommentError::NotFound)?;

        if comment.deleted_at.is_some() || comment.status != "visible" {
            return Err(CommentError::NotFound);
        }

        self.ensure_post_readable(comment.post_id)
            .map_err(|_| CommentError::NotFound)?;

        Ok(comment)
    }
}
