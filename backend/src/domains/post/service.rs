use std::sync::Arc;

use chrono::Utc;
use uuid::Uuid;

use crate::{
    domains::post::{error::PostError, repository::PostRepository},
    infrastructure::database::models::entities::Post,
};

pub struct PostService {
    repo: Arc<dyn PostRepository>,
}

impl PostService {
    pub fn new(repo: Arc<dyn PostRepository>) -> Self {
        Self { repo }
    }

    pub fn create(
        &self,
        author_id: Uuid,
        title: &str,
        content: Option<&str>,
    ) -> Result<Post, PostError> {
        let title = title.trim();
        if title.is_empty() {
            return Err(PostError::EmptyTitle);
        }
        if title.len() > 255 {
            return Err(PostError::TitleTooLong);
        }
        if content.is_some_and(|c| c.len() > 100_000) {
            return Err(PostError::ContentTooLong);
        }

        let now = Utc::now();
        let post = Post {
            id: Uuid::nil(),
            author_id,
            title: title.to_string(),
            content: content.map(|s| s.to_string()),
            view_count: 0,
            status: "published".into(),
            comments_locked: false,
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };

        Ok(self.repo.create(&post)?)
    }

    fn get_active(&self, id: Uuid) -> Result<Post, PostError> {
        let post = self.repo.find_by_id(id)?.ok_or(PostError::NotFound)?;
        if post.deleted_at.is_some() {
            return Err(PostError::NotFound);
        }
        Ok(post)
    }

    pub fn get_published(&self, id: Uuid) -> Result<Post, PostError> {
        self.repo
            .find_published_by_id(id)?
            .ok_or(PostError::NotFound)
    }

    pub fn get_owned(&self, id: Uuid, owner_id: Uuid) -> Result<Post, PostError> {
        let post = self.get_active(id)?;
        if post.author_id != owner_id {
            return Err(PostError::NotFound);
        }
        Ok(post)
    }

    pub fn get_any(&self, id: Uuid) -> Result<Post, PostError> {
        self.repo.find_by_id(id)?.ok_or(PostError::NotFound)
    }

    pub fn update_content(
        &self,
        id: Uuid,
        requester_id: Uuid,
        title: &str,
        content: Option<&str>,
    ) -> Result<Post, PostError> {
        let mut post = self.get_active(id)?;

        if post.author_id != requester_id {
            return Err(PostError::Forbidden);
        }

        if post.status == "hidden" {
            return Err(PostError::HiddenCannotEdit);
        }

        let title = title.trim();
        if title.is_empty() {
            return Err(PostError::EmptyTitle);
        }
        if title.len() > 255 {
            return Err(PostError::TitleTooLong);
        }
        if content.is_some_and(|c| c.len() > 100_000) {
            return Err(PostError::ContentTooLong);
        }

        post.title = title.to_string();
        post.content = content.map(|s| s.to_string());
        post.updated_at = Utc::now();

        Ok(self.repo.update_content(&post)?)
    }

    pub fn update_status(
        &self,
        id: Uuid,
        requester_id: Uuid,
        is_staff: bool,
        status: &str,
    ) -> Result<Post, PostError> {
        let post = self.get_active(id)?;
        let is_owner = post.author_id == requester_id;

        if !is_owner && !is_staff {
            return Err(PostError::Forbidden);
        }

        match status {
            "hidden" => {
                if !is_staff {
                    return Err(PostError::OnlyStaffCanChangeStatus);
                }
            }
            "published" => {}
            _ => return Err(PostError::InvalidStatus),
        }

        Ok(self.repo.update_status(id, status)?)
    }

    pub fn delete(&self, id: Uuid, requester_id: Uuid, is_staff: bool) -> Result<(), PostError> {
        let post = self.get_active(id)?;

        if post.author_id != requester_id && !is_staff {
            return Err(PostError::Forbidden);
        }

        Ok(self.repo.delete(id)?)
    }

    pub fn restore(&self, id: Uuid, requester_id: Uuid, is_staff: bool) -> Result<Post, PostError> {
        if !is_staff {
            return Err(PostError::Forbidden);
        }

        let post = self.repo.find_by_id(id)?.ok_or(PostError::NotFound)?;

        if post.deleted_at.is_none() {
            return Err(PostError::NotFound);
        }
        if post.author_id != requester_id {
            return Err(PostError::NotFound);
        }

        Ok(self.repo.restore(id)?)
    }

    pub fn list_my_posts(&self, author_id: Uuid) -> Result<Vec<Post>, PostError> {
        Ok(self.repo.find_by_author(author_id)?)
    }

    pub fn list_published_by_author(&self, author_id: Uuid) -> Result<Vec<Post>, PostError> {
        Ok(self.repo.find_published_by_author(author_id)?)
    }

    pub fn list_deleted(&self, author_id: Uuid) -> Result<Vec<Post>, PostError> {
        Ok(self.repo.find_deleted_by_author(author_id)?)
    }
}
