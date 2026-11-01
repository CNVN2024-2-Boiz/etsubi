use std::sync::Arc;

use chrono::Utc;
use uuid::Uuid;
use whichlang::{Lang, detect_language};

use crate::{
    domains::{
        comment::{error::CommentError, repository::CommentRepository},
        post::repository::PostRepository,
        user::repository::UserRepository,
    },
    infrastructure::database::models::entities::Comment,
};

pub struct CommentService {
    comment_repo: Arc<dyn CommentRepository>,
    post_repo: Arc<dyn PostRepository>,
    user_repo: Arc<dyn UserRepository>,
}

impl CommentService {
    pub fn new(
        comment_repo: Arc<dyn CommentRepository>,
        post_repo: Arc<dyn PostRepository>,
        user_repo: Arc<dyn UserRepository>,
    ) -> Self {
        Self {
            comment_repo,
            post_repo,
            user_repo,
        }
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
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(CommentError::UserNotFound)?;

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
                .comment_repo
                .find_by_id(parent_id)?
                .ok_or(CommentError::ParentUnavailable)?;

            if parent.post_id != post_id
                || parent.deleted_at.is_some()
                || parent.status != "visible"
            {
                return Err(CommentError::ParentUnavailable);
            }
        }

        let detected_language = match detect_language(content) {
            Lang::Vie => "vi",
            Lang::Jpn => "ja",
            Lang::Eng => "en",
            _ => "vi",
        }
        .to_string();

        let now = Utc::now();

        let comment = Comment {
            id: Uuid::nil(),
            parent_id,
            post_id,
            user_id: requester.id,
            content: content.to_string(),
            language: detected_language,
            status: "visible".into(),
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };

        Ok(self.comment_repo.create(&comment)?)
    }

    fn get_active(&self, id: Uuid) -> Result<Comment, CommentError> {
        let comment = self
            .comment_repo
            .find_by_id(id)?
            .ok_or(CommentError::NotFound)?;
        if comment.deleted_at.is_some() {
            return Err(CommentError::NotFound);
        }
        Ok(comment)
    }

    pub fn get_any(&self, id: Uuid, requester_id: Uuid) -> Result<Comment, CommentError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(CommentError::UserNotFound)?;

        if !matches!(requester.role.as_str(), "moderator" | "admin") {
            return Err(CommentError::RequiresStaff);
        }

        self.comment_repo
            .find_by_id(id)?
            .ok_or(CommentError::NotFound)
    }

    pub fn update_content(
        &self,
        id: Uuid,
        requester_id: Uuid,
        content: &str,
    ) -> Result<Comment, CommentError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(CommentError::UserNotFound)?;
        let mut comment = self.get_active(id)?;

        self.ensure_post_mutable(comment.post_id)?;

        if comment.user_id != requester.id {
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

        let detected_language = match detect_language(content) {
            Lang::Vie => "vi",
            Lang::Jpn => "ja",
            Lang::Eng => "en",
            _ => "vi",
        }
        .to_string();

        comment.language = detected_language;
        comment.updated_at = Utc::now();

        Ok(self.comment_repo.update_content(&comment)?)
    }

    pub fn update_status(
        &self,
        id: Uuid,
        requester_id: Uuid,
        status: &str,
    ) -> Result<Comment, CommentError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(CommentError::UserNotFound)?;

        if !matches!(requester.role.as_str(), "moderator" | "admin") {
            return Err(CommentError::RequiresStaff);
        }

        if !matches!(status, "visible" | "hidden") {
            return Err(CommentError::InvalidStatus);
        }

        let comment = self.get_active(id)?;
        Ok(self.comment_repo.update_status(comment.id, status)?)
    }

    pub fn delete(&self, id: Uuid, requester_id: Uuid) -> Result<(), CommentError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(CommentError::UserNotFound)?;
        let comment = self.get_active(id)?;

        self.ensure_post_mutable(comment.post_id)?;

        let is_owner = comment.user_id == requester.id;
        let is_staff = matches!(requester.role.as_str(), "moderator" | "admin");

        if !is_owner && !is_staff {
            return Err(CommentError::Forbidden);
        }

        self.comment_repo.delete(id)?;
        Ok(())
    }

    pub fn restore(&self, id: Uuid, requester_id: Uuid) -> Result<Comment, CommentError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(CommentError::UserNotFound)?;

        if !matches!(requester.role.as_str(), "moderator" | "admin") {
            return Err(CommentError::RequiresStaff);
        }

        let comment = self
            .comment_repo
            .find_by_id(id)?
            .ok_or(CommentError::NotFound)?;

        if comment.deleted_at.is_none() {
            return Err(CommentError::NotFound);
        }

        Ok(self.comment_repo.restore(id)?)
    }

    pub fn list_visible_by_post(&self, post_id: Uuid) -> Result<Vec<Comment>, CommentError> {
        self.ensure_post_readable(post_id)?;
        Ok(self.comment_repo.find_visible_by_post(post_id)?)
    }

    pub fn list_all_by_post(
        &self,
        post_id: Uuid,
        requester_id: Uuid,
    ) -> Result<Vec<Comment>, CommentError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(CommentError::UserNotFound)?;

        if !matches!(requester.role.as_str(), "moderator" | "admin") {
            return Err(CommentError::RequiresStaff);
        }

        Ok(self.comment_repo.find_by_post(post_id)?)
    }

    pub fn list_my_comments(&self, author_id: Uuid) -> Result<Vec<Comment>, CommentError> {
        let author = self
            .user_repo
            .find_by_id(author_id)?
            .ok_or(CommentError::UserNotFound)?;
        Ok(self.comment_repo.find_by_author(author.id)?)
    }

    pub fn get_visible(&self, id: Uuid) -> Result<Comment, CommentError> {
        let comment = self
            .comment_repo
            .find_by_id(id)?
            .ok_or(CommentError::NotFound)?;

        if comment.deleted_at.is_some() || comment.status != "visible" {
            return Err(CommentError::NotFound);
        }

        self.ensure_post_readable(comment.post_id)
            .map_err(|_| CommentError::NotFound)?;

        Ok(comment)
    }

    pub fn get_owned(&self, id: Uuid, owner_id: Uuid) -> Result<Comment, CommentError> {
        let owner = self
            .user_repo
            .find_by_id(owner_id)?
            .ok_or(CommentError::UserNotFound)?;

        let comment = self
            .comment_repo
            .find_by_id(id)?
            .ok_or(CommentError::NotFound)?;
        if comment.user_id != owner.id {
            return Err(CommentError::NotFound);
        }
        Ok(comment)
    }
}
