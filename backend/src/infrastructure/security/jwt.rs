use anyhow::{Result, anyhow};
use chrono::{Duration, Utc};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const PURPOSES: [&str; 5] = ["", "verify", "reset", "magic", "change"];

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub purpose: String,
    pub exp: usize,
    pub iat: usize,
}

pub fn create_token(
    user_id: Uuid,
    role: String,
    purpose: String,
    secret: &str,
    hours: i64,
) -> Result<String> {
    if !PURPOSES.contains(&purpose.as_str()) {
        return Err(anyhow!("Invalid purpose: {}", purpose));
    }

    let now = Utc::now();
    let claims = Claims {
        sub: user_id,
        role,
        purpose,
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

    let claims = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map(|d| d.claims)
    .map_err(|e| anyhow!("JWT verify: {}", e))?;

    if !PURPOSES.contains(&claims.purpose.as_str()) {
        return Err(anyhow!("Invalid purpose: {}", claims.purpose));
    }

    Ok(claims)
}
