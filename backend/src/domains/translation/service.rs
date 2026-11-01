use std::sync::Arc;

use uuid::Uuid;

use crate::domains::{
    comment::repository::CommentRepository,
    post::repository::PostRepository,
    translation::{
        client::{TranslateRequest, TranslationClient},
        error::TranslationError,
        repository::TranslationRepository,
    },
    user::repository::UserRepository,
};

pub const MAX_TRANSLATE_CONTENT_CHARS: usize = 15_000;
const MAX_CONTEXT_CHARS: usize = 2_000;

pub struct TranslatedPost {
    pub language: String,
    pub source_language: String,
    pub title: String,
    pub content: String,
    pub translated: bool,
}

pub struct TranslatedComment {
    pub language: String,
    pub source_language: String,
    pub content: String,
    pub translated: bool,
}

pub struct TranslationService {
    user_repo: Arc<dyn UserRepository>,
    post_repo: Arc<dyn PostRepository>,
    comment_repo: Arc<dyn CommentRepository>,
    translation_repo: Arc<dyn TranslationRepository>,
    client: Option<Arc<dyn TranslationClient>>,
}

impl TranslationService {
    pub fn new(
        user_repo: Arc<dyn UserRepository>,
        post_repo: Arc<dyn PostRepository>,
        comment_repo: Arc<dyn CommentRepository>,
        translation_repo: Arc<dyn TranslationRepository>,
        client: Option<Arc<dyn TranslationClient>>,
    ) -> Self {
        Self {
            user_repo,
            post_repo,
            comment_repo,
            translation_repo,
            client,
        }
    }

    fn client(&self) -> Result<&Arc<dyn TranslationClient>, TranslationError> {
        self.client.as_ref().ok_or(TranslationError::NotConfigured)
    }

    pub async fn translate_post(
        &self,
        requester_id: Uuid,
        post_id: Uuid,
    ) -> Result<TranslatedPost, TranslationError> {
        let user = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(TranslationError::UserNotFound)?;

        let post = self
            .post_repo
            .find_published_by_id(post_id)?
            .ok_or(TranslationError::PostNotFound)?;

        let source_language = post.language.clone();
        let target_language = user.language.clone();

        if source_language == target_language {
            return Ok(TranslatedPost {
                language: target_language,
                source_language,
                title: post.title.clone(),
                content: post.content.clone(),
                translated: false,
            });
        }

        if let Some(t) = self
            .translation_repo
            .find_post_translation(post_id, &target_language)?
        {
            return Ok(TranslatedPost {
                language: t.language,
                source_language,
                title: t.title,
                content: t.content,
                translated: true,
            });
        }

        if post.content.chars().count() > MAX_TRANSLATE_CONTENT_CHARS
            || post.title.chars().count() > MAX_TRANSLATE_CONTENT_CHARS
        {
            return Err(TranslationError::ContentTooLong(
                MAX_TRANSLATE_CONTENT_CHARS,
            ));
        }

        let req = TranslateRequest::post(
            &source_language,
            &target_language,
            &post.title,
            &post.content,
        );

        if req.is_empty() {
            return Ok(TranslatedPost {
                language: target_language,
                source_language,
                title: post.title.clone(),
                content: post.content.clone(),
                translated: false,
            });
        }

        let client = self.client()?;
        let result = client.translate(req.clone()).await?;
        result.validate_against(&req)?;

        let title_out = result
            .get("title")
            .map(str::to_owned)
            .unwrap_or_else(|| post.title.clone());
        let content_out = result
            .get("content")
            .map(str::to_owned)
            .unwrap_or_else(|| post.content.clone());

        let row = self.translation_repo.upsert_post_translation(
            post_id,
            &target_language,
            &title_out,
            &content_out,
        )?;

        Ok(TranslatedPost {
            language: row.language,
            source_language,
            title: row.title,
            content: row.content,
            translated: true,
        })
    }

    pub async fn translate_comment(
        &self,
        requester_id: Uuid,
        comment_id: Uuid,
    ) -> Result<TranslatedComment, TranslationError> {
        let user = self
            .user_repo
            .find_by_id(requester_id)?
            .ok_or(TranslationError::UserNotFound)?;

        let comment = self
            .comment_repo
            .find_by_id(comment_id)?
            .filter(|c| c.deleted_at.is_none() && c.status == "visible")
            .ok_or(TranslationError::CommentNotFound)?;

        let post = self
            .post_repo
            .find_published_by_id(comment.post_id)?
            .ok_or(TranslationError::PostNotFound)?;

        let source_language = comment.language.clone();
        let target_language = user.language.clone();

        if source_language == target_language {
            return Ok(TranslatedComment {
                language: target_language,
                source_language,
                content: comment.content.clone(),
                translated: false,
            });
        }

        if let Some(t) = self
            .translation_repo
            .find_comment_translation(comment_id, &target_language)?
        {
            return Ok(TranslatedComment {
                language: t.language,
                source_language,
                content: t.content,
                translated: true,
            });
        }

        if comment.content.chars().count() > MAX_TRANSLATE_CONTENT_CHARS {
            return Err(TranslationError::ContentTooLong(
                MAX_TRANSLATE_CONTENT_CHARS,
            ));
        }

        let mut context = format!("Post title: {}", post.title);
        if let Some(parent_id) = comment.parent_id
            && let Some(parent) = self.comment_repo.find_by_id(parent_id)?
            && parent.deleted_at.is_none()
        {
            let snippet = truncate_chars(&parent.content, MAX_CONTEXT_CHARS);
            context.push_str(&format!("\nParent comment: {}", snippet));
        }
        let context = truncate_chars(&context, MAX_CONTEXT_CHARS);

        let req = TranslateRequest::comment(
            &source_language,
            &target_language,
            &comment.content,
            Some(context),
        );

        if req.is_empty() {
            return Ok(TranslatedComment {
                language: target_language,
                source_language,
                content: comment.content.clone(),
                translated: false,
            });
        }

        let client = self.client()?;
        let result = client.translate(req.clone()).await?;
        result.validate_against(&req)?;

        let content_out = result
            .get("content")
            .map(str::to_owned)
            .unwrap_or_else(|| comment.content.clone());

        let row = self.translation_repo.upsert_comment_translation(
            comment_id,
            &target_language,
            &content_out,
        )?;

        Ok(TranslatedComment {
            language: row.language,
            source_language,
            content: row.content,
            translated: true,
        })
    }
}

fn truncate_chars(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        s.chars().take(max).collect()
    }
}
