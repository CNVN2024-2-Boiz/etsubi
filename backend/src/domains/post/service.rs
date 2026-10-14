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
        status: &str,
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

        let valid_status = ["draft", "published", "hidden"];
        if !valid_status.contains(&status) {
            return Err(PostError::InvalidStatus);
        }

        let now = Utc::now();
        let post = Post {
            id: Uuid::nil(),
            author_id,
            title: title.to_string(),
            content: content.map(|s| s.to_string()),
            view_count: 0,
            status: status.to_string(),
            comments_locked: false,
            created_at: now,
            updated_at: now,
        };

        Ok(self.repo.create(&post)?)
    }

    pub fn get(&self, id: Uuid) -> Result<Post, PostError> {
        self.repo.find_by_id(id)?.ok_or(PostError::NotFound)
    }

    pub fn get_published(&self, id: Uuid) -> Result<Post, PostError> {
        self.repo
            .find_published_by_id(id)?
            .ok_or(PostError::NotFound)
    }

    pub fn get_owned(&self, id: Uuid, author_id: Uuid) -> Result<Post, PostError> {
        let post = self.get(id)?;
        if post.author_id != author_id {
            return Err(PostError::NotFound);
        }
        Ok(post)
    }

    pub fn update_content(
        &self,
        id: Uuid,
        requester_id: Uuid,
        title: &str,
        content: Option<&str>,
    ) -> Result<Post, PostError> {
        let mut post = self.get(id)?;

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
        let post = self.get(id)?;
        let is_owner = post.author_id == requester_id;

        if !is_owner && !is_staff {
            return Err(PostError::Forbidden);
        }

        if post.status == "hidden" && !is_staff {
            return Err(PostError::HiddenOnlyStaffCanChangeStatus);
        }

        match status {
            "hidden" => {
                if !is_staff {
                    return Err(PostError::OnlyStaffCanHide);
                }
            }
            "draft" => {
                if !is_owner {
                    return Err(PostError::Forbidden);
                }
            }
            "published" => {}
            _ => return Err(PostError::InvalidStatus),
        }

        Ok(self.repo.update_status(id, status)?)
    }

    pub fn delete(&self, id: Uuid, requester_id: Uuid, is_staff: bool) -> Result<(), PostError> {
        let post = self.get(id)?;

        if post.author_id != requester_id && !is_staff {
            return Err(PostError::Forbidden);
        }

        Ok(self.repo.delete(id)?)
    }

    pub fn list_my_posts(&self, author_id: Uuid) -> Result<Vec<Post>, PostError> {
        Ok(self.repo.find_by_author(author_id)?)
    }

    pub fn list_published_by_author(&self, author_id: Uuid) -> Result<Vec<Post>, PostError> {
        Ok(self.repo.find_published_by_author(author_id)?)
    }
}
