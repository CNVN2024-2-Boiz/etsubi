#[derive(Debug, thiserror::Error)]
pub enum EmailError {
    #[error("Provider error: {0}")]
    Provider(String),

    #[error("Network timeout")]
    Timeout,

    #[error("Invalid recipient: {0}")]
    InvalidRecipient(String),

    #[error("Missing config: {0}")]
    Config(String),
}

#[async_trait::async_trait]
pub trait EmailService: Send + Sync {
    async fn send_verification(&self, to: &str, token: &str) -> Result<(), EmailError>;
}
