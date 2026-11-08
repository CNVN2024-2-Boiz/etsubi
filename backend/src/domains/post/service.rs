use std::sync::Arc;

use chrono::Utc;
use uuid::Uuid;
use whichlang::{Lang, detect_language};

use crate::{
    domains::{
        post::{error::PostError, repository::PostRepository},
        user::repository::UserRepository,
    },
    infrastructure::database::models::entities::Post,
};

pub struct PostService {
    post_repo: Arc<dyn PostRepository>,
    user_repo: Arc<dyn UserRepository>,
}

impl PostService {
    pub fn new(post_repo: Arc<dyn PostRepository>, user_repo: Arc<dyn UserRepository>) -> Self {
        Self {
            post_repo,
            user_repo,
        }
    }

    pub fn create(
        &self,
        author_id: Uuid,
        title: &str,
        content: &str,
        latitude: Option<f64>,
        longitude: Option<f64>,
    ) -> Result<Post, PostError> {
        let title = title.trim();
        if title.is_empty() {
            return Err(PostError::EmptyTitle);
        }
        if title.len() > 255 {
            return Err(PostError::TitleTooLong);
        }
        if content.len() > 100_000 {
            return Err(PostError::ContentTooLong);
        }

        let text_to_detect = format!("{} {}", title, content);

        let detected_language = match detect_language(&text_to_detect) {
            Lang::Vie => "vi",
            Lang::Jpn => "ja",
            Lang::Eng => "en",
            _ => "vi",
        }
        .to_string();

        let now = Utc::now();
        let post = Post {
            id: Uuid::nil(),
            author_id,
            title: title.to_string(),
            content: content.to_string(),
            language: detected_language,
            latitude,
            longitude,
            status: "published".into(),
            comments_locked: false,
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };

        Ok(self.post_repo.create(&post)?)
    }

    fn get_active(&self, id: Uuid) -> Result<Post, PostError> {
        let post = self.post_repo.find_by_id(id)?.ok_or(PostError::NotFound)?;
        if post.deleted_at.is_some() {
            return Err(PostError::NotFound);
        }
        Ok(post)
    }

    pub fn get_published(&self, id: Uuid) -> Result<Post, PostError> {
        self.post_repo
            .find_published_by_id(id)?
            .ok_or(PostError::NotFound)
    }

    pub fn get_owned(&self, id: Uuid, owner_id: Uuid) -> Result<Post, PostError> {
        let post = self.get_active(id)?;
        let owner = self
            .user_repo
            .find_by_id(owner_id)?
            .ok_or(PostError::NotFound)?;

        if post.author_id != owner.id {
            return Err(PostError::NotFound);
        }

        Ok(post)
    }

    pub fn get_any(&self, id: Uuid) -> Result<Post, PostError> {
        self.post_repo.find_by_id(id)?.ok_or(PostError::NotFound)
    }

    pub fn update_content(
        &self,
        id: Uuid,
        requester_id: Uuid,
        title: &str,
        content: &str,
    ) -> Result<Post, PostError> {
        let mut post = self.get_active(id)?;
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(PostError::UserNotFound)?;

        if post.author_id != requester.id {
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
        if content.len() > 100_000 {
            return Err(PostError::ContentTooLong);
        }

        post.title = title.to_string();
        post.content = content.to_string();

        let text_to_detect = format!("{} {}", title, content);

        let detected_language = match detect_language(&text_to_detect) {
            Lang::Vie => "vi",
            Lang::Jpn => "ja",
            Lang::Eng => "en",
            _ => "vi",
        }
        .to_string();

        post.language = detected_language;

        post.updated_at = Utc::now();

        Ok(self.post_repo.update_content(&post)?)
    }

    pub fn update_status(
        &self,
        id: Uuid,
        requester_id: Uuid,
        status: &str,
    ) -> Result<Post, PostError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(PostError::Forbidden)?;

        if !matches!(requester.role.as_str(), "moderator" | "admin") {
            return Err(PostError::Forbidden);
        }

        match status {
            "hidden" | "published" => {}
            _ => return Err(PostError::InvalidStatus),
        }

        let post = self.post_repo.find_by_id(id)?.ok_or(PostError::NotFound)?;
        if post.deleted_at.is_some() {
            return Err(PostError::NotFound);
        }

        Ok(self.post_repo.update_status(id, status)?)
    }

    pub fn delete(&self, id: Uuid, requester_id: Uuid) -> Result<(), PostError> {
        let post = self.get_active(id)?;
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(PostError::UserNotFound)?;

        let is_owner = post.author_id == requester.id;
        let is_staff = matches!(requester.role.as_str(), "moderator" | "admin");

        if !is_owner && !is_staff {
            return Err(PostError::Forbidden);
        }

        Ok(self.post_repo.delete(id)?)
    }

    pub fn restore(&self, post_id: Uuid, requester_id: Uuid) -> Result<Post, PostError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(PostError::UserNotFound)?;

        if !matches!(requester.role.as_str(), "moderator" | "admin") {
            return Err(PostError::Forbidden);
        }

        let post = self
            .post_repo
            .find_by_id(post_id)?
            .ok_or(PostError::NotFound)?;
        if post.deleted_at.is_none() {
            return Err(PostError::NotFound);
        }

        Ok(self.post_repo.restore(post_id)?)
    }

    pub fn list_my_posts(&self, author_id: Uuid) -> Result<Vec<Post>, PostError> {
        Ok(self.post_repo.find_by_author(author_id)?)
    }

    pub fn list_published_by_author(&self, author_id: Uuid) -> Result<Vec<Post>, PostError> {
        Ok(self.post_repo.find_published_by_author(author_id)?)
    }

    pub fn list_deleted(&self, author_id: Uuid) -> Result<Vec<Post>, PostError> {
        Ok(self.post_repo.find_deleted_by_author(author_id)?)
    }

    pub fn search(
        &self,
        query: Option<&str>,
        tag_ids: &[Uuid],
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Post>, PostError> {
        Ok(self.post_repo.search_published(
            query.map(str::trim).filter(|s| !s.is_empty()),
            tag_ids,
            limit.unwrap_or(20).clamp(1, 50),
            offset.unwrap_or(0).max(0),
        )?)
    }

    pub fn set_comments_locked(
        &self,
        post_id: Uuid,
        requester_id: Uuid,
        locked: bool,
    ) -> Result<Post, PostError> {
        let requester = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(PostError::UserNotFound)?;

        let post = self.get_active(post_id)?;

        let is_owner = post.author_id == requester.id;
        let is_staff = matches!(requester.role.as_str(), "moderator" | "admin");

        if !is_owner && !is_staff {
            return Err(PostError::Forbidden);
        }

        Ok(self.post_repo.set_comments_locked(post_id, locked)?)
    }
}
