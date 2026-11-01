use async_trait::async_trait;

use super::error::TranslationError;

#[derive(Debug, Clone)]
pub struct TranslateField {
    pub key: String,
    pub text: String,
}

#[derive(Debug, Clone)]
pub struct TranslateRequest {
    pub source_lang: String,
    pub target_lang: String,
    pub fields: Vec<TranslateField>,
    pub context: Option<String>,
}

impl TranslateRequest {
    pub fn post(source_lang: &str, target_lang: &str, title: &str, content: &str) -> Self {
        let mut fields = Vec::with_capacity(2);
        if !title.trim().is_empty() {
            fields.push(TranslateField {
                key: "title".into(),
                text: title.into(),
            });
        }
        if !content.trim().is_empty() {
            fields.push(TranslateField {
                key: "content".into(),
                text: content.into(),
            });
        }
        Self {
            source_lang: source_lang.into(),
            target_lang: target_lang.into(),
            fields,
            context: None,
        }
    }

    pub fn comment(
        source_lang: &str,
        target_lang: &str,
        content: &str,
        context: Option<String>,
    ) -> Self {
        let mut fields = Vec::with_capacity(1);
        if !content.trim().is_empty() {
            fields.push(TranslateField {
                key: "content".into(),
                text: content.into(),
            });
        }
        Self {
            source_lang: source_lang.into(),
            target_lang: target_lang.into(),
            fields,
            context,
        }
    }

    pub fn is_empty(&self) -> bool {
        self.fields.is_empty()
    }
}

#[derive(Debug, Clone)]
pub struct TranslatedField {
    pub key: String,
    pub text: String,
}

#[derive(Debug, Clone, Default)]
pub struct TranslateResult {
    pub fields: Vec<TranslatedField>,
}

impl TranslateResult {
    pub fn get(&self, key: &str) -> Option<&str> {
        self.fields
            .iter()
            .find(|f| f.key == key)
            .map(|f| f.text.as_str())
    }

    pub fn validate_against(&self, req: &TranslateRequest) -> Result<(), TranslationError> {
        for f in &req.fields {
            match self.get(&f.key) {
                Some(t) if !t.trim().is_empty() => {}
                _ => return Err(TranslationError::UpstreamBadResponse),
            }
        }
        Ok(())
    }
}

#[async_trait]
pub trait TranslationClient: Send + Sync {
    async fn translate(&self, req: TranslateRequest) -> Result<TranslateResult, TranslationError>;
}
