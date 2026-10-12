use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Deserialize, ToSchema)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct RegisterResponse {
    pub user_id: i64,
}

#[derive(Serialize, ToSchema)]
pub struct LoginResponse {
    pub user_id: i64,
    pub token: String,
}
