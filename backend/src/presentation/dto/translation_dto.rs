use serde::Serialize;
use utoipa::ToSchema;

use crate::domains::translation::service::{TranslatedComment, TranslatedPost};

#[derive(Debug, Serialize, ToSchema)]
pub struct PostTranslationResponse {
    pub language: String,
    pub source_language: String,
    pub title: String,
    pub content: String,
    pub translated: bool,
}

impl From<TranslatedPost> for PostTranslationResponse {
    fn from(v: TranslatedPost) -> Self {
        Self {
            language: v.language,
            source_language: v.source_language,
            title: v.title,
            content: v.content,
            translated: v.translated,
        }
    }
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CommentTranslationResponse {
    pub language: String,
    pub source_language: String,
    pub content: String,
    pub translated: bool,
}

impl From<TranslatedComment> for CommentTranslationResponse {
    fn from(v: TranslatedComment) -> Self {
        Self {
            language: v.language,
            source_language: v.source_language,
            content: v.content,
            translated: v.translated,
        }
    }
}
