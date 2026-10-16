use anyhow::{Result, anyhow};
use chrono::{Duration, Utc};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const PURPOSE_ACCESS: &str = "";
pub const PURPOSE_VERIFY: &str = "verify";

const PURPOSES: [&str; 2] = [PURPOSE_ACCESS, PURPOSE_VERIFY];

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
    purpose: &str,
    secret: &str,
    hours: i64,
) -> Result<String> {
    if !PURPOSES.contains(&purpose) {
        return Err(anyhow!("Invalid purpose: {}", purpose));
    }

    let now = Utc::now();
    let claims = Claims {
        sub: user_id,
        role,
        purpose: purpose.to_string(),
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

pub fn verify_token(token: &str, secret: &str, expected_purpose: &str) -> Result<Claims> {
    if !PURPOSES.contains(&expected_purpose) {
        return Err(anyhow!("Invalid expected purpose: {}", expected_purpose));
    }

    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let claims = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map(|d| d.claims)
    .map_err(|e| anyhow!("JWT verify: {}", e))?;

    if claims.purpose != expected_purpose {
        return Err(anyhow!(
            "Unexpected token purpose: expected {:?}, got {:?}",
            expected_purpose,
            claims.purpose
        ));
    }

    Ok(claims)
}
