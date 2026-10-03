use anyhow::{Result, anyhow};
use chrono::{Duration, Utc};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: i64,
    pub roles: Vec<String>,
    pub exp: usize,
    pub iat: usize,
}

pub fn create_token(user_id: i64, roles: Vec<String>, secret: &str, hours: i64) -> Result<String> {
    let now = Utc::now();
    let claims = Claims {
        sub: user_id,
        roles,
        exp: (now + Duration::hours(hours)).timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| anyhow!("JWT encode: {}", e))
}

pub fn verify_token(token: &str, secret: &str) -> Result<Claims> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map(|d| d.claims)
    .map_err(|e| anyhow!("JWT verify: {}", e))
}
