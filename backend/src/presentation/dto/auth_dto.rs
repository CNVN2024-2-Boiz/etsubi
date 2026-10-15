use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Deserialize, ToSchema)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct RegisterResponse {
    pub user_id: Uuid,
}

#[derive(Deserialize, ToSchema)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct LoginResponse {
    pub user_id: Uuid,
    pub token: String,
}

#[derive(Deserialize, ToSchema)]
pub struct VerifyEmailRequest {
    pub token: String,
}

#[derive(Serialize, ToSchema)]
pub struct VerifyEmailResponse {
    pub user_id: Uuid,
}

#[derive(Serialize, ToSchema)]
pub struct ResendVerificationResponse {
    pub message: String,
}

#[derive(Deserialize, ToSchema)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Serialize, ToSchema)]
pub struct ForgotPasswordResponse {
    pub message: String,
}

#[derive(Deserialize, ToSchema)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

#[derive(Serialize, ToSchema)]
pub struct ResetPasswordResponse {
    pub message: String,
}

#[derive(Deserialize, ToSchema)]
pub struct MagicLinkRequest {
    pub email: String,
}

#[derive(Serialize, ToSchema)]
pub struct MagicLinkResponse {
    pub message: String,
}

#[derive(Deserialize, ToSchema)]
pub struct MagicLoginRequest {
    pub token: String,
}

#[derive(Deserialize, ToSchema)]
pub struct ChangeEmailRequest {
    pub new_email: String,
}

#[derive(Serialize, ToSchema)]
pub struct ChangeEmailResponse {
    pub message: String,
}

#[derive(Deserialize, ToSchema)]
pub struct ConfirmEmailChangeRequest {
    pub token: String,
}

#[derive(Serialize, ToSchema)]
pub struct ConfirmEmailChangeResponse {
    pub message: String,
}
