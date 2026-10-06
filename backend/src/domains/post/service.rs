use std::sync::Arc;

use anyhow::{Result, anyhow};
use chrono::Utc;

use crate::{
    domains::post::repository::PostRepository, infrastructure::database::models::entities::Post,
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
        author_id: i64,
        title: &str,
        content: Option<&str>,
        status: &str,
    ) -> Result<Post> {
        let title = title.trim();
        if title.is_empty() {
            return Err(anyhow!("Title cannot be empty"));
        }
        if title.len() > 255 {
            return Err(anyhow!("Title too long"));
        }
        if content.is_some_and(|c| c.len() > 100_000) {
            return Err(anyhow!("Content too long"));
        }

        let valid_status = ["draft", "published", "hidden"];
        if !valid_status.contains(&status) {
            return Err(anyhow!("Invalid status"));
        }

        let now = Utc::now();
        let post = Post {
            id: 0,
            author_id,
            title: title.to_string(),
            content: content.map(|s| s.to_string()),
            view_count: 0,
            status: status.to_string(),
            comments_locked: false,
            created_at: now,
            updated_at: now,
        };

        self.repo.create(&post)
    }

    pub fn get(&self, id: i64) -> Result<Post> {
        self.repo
            .find_by_id(id)?
            .ok_or_else(|| anyhow!("Post not found"))
    }

    pub fn get_published(&self, id: i64) -> Result<Post> {
        self.repo
            .find_published_by_id(id)?
            .ok_or_else(|| anyhow!("Post not found"))
    }

    pub fn get_owned(&self, id: i64, author_id: i64) -> Result<Post> {
        let post = self.get(id)?;
        if post.author_id != author_id {
            return Err(anyhow!("Post not found"));
        }
        Ok(post)
    }

    pub fn update_content(
        &self,
        id: i64,
        requester_id: i64,
        title: &str,
        content: Option<&str>,
    ) -> Result<Post> {
        let mut post = self.get(id)?;

        if post.author_id != requester_id {
            return Err(anyhow!("Not allowed"));
        }

        if post.status == "hidden" {
            return Err(anyhow!("Post is hidden, cannot edit"));
        }

        let title = title.trim();
        if title.is_empty() {
            return Err(anyhow!("Title cannot be empty"));
        }
        if title.len() > 255 {
            return Err(anyhow!("Title too long"));
        }
        if content.is_some_and(|c| c.len() > 100_000) {
            return Err(anyhow!("Content too long"));
        }

        post.title = title.to_string();
        post.content = content.map(|s| s.to_string());
        post.updated_at = Utc::now();

        self.repo.update_content(&post)
    }

    pub fn update_status(
        &self,
        id: i64,
        requester_id: i64,
        is_staff: bool,
        status: &str,
    ) -> Result<Post> {
        let post = self.get(id)?;
        let is_owner = post.author_id == requester_id;

        if !is_owner && !is_staff {
            return Err(anyhow!("Not allowed"));
        }

        if post.status == "hidden" && !is_staff {
            return Err(anyhow!("Post is hidden, only staff can change status"));
        }

        match status {
            "hidden" => {
                if !is_staff {
                    return Err(anyhow!("Only staff can hide posts"));
                }
            }
            "draft" => {
                if !is_owner {
                    return Err(anyhow!("Not allowed"));
                }
            }
            "published" => {}
            _ => return Err(anyhow!("Invalid status")),
        }

        self.repo.update_status(id, status)
    }

    pub fn delete(&self, id: i64, requester_id: i64, is_staff: bool) -> Result<()> {
        let post = self.get(id)?;

        if post.author_id != requester_id && !is_staff {
            return Err(anyhow!("Not allowed"));
        }

        self.repo.delete(id)
    }

    pub fn list_my_posts(&self, author_id: i64) -> Result<Vec<Post>> {
        self.repo.find_by_author(author_id)
    }

    pub fn list_published_by_author(&self, author_id: i64) -> Result<Vec<Post>> {
        self.repo.find_published_by_author(author_id)
    }
}
