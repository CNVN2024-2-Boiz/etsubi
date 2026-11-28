use anyhow::{Result, anyhow};
use chrono::{Duration, Utc};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub role: String,
    pub ver: i32,
    pub exp: usize,
    pub iat: usize,
}

pub fn create_token(
    user_id: Uuid,
    role: String,
    token_version: i32,
    secret: &str,
    hours: i64,
) -> Result<String> {
    let now = Utc::now();
    let claims = Claims {
        sub: user_id,
        role,
        ver: token_version,
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

/// Loại token gửi qua email; ghi vào claim `typ` để token xác nhận không dùng để đặt lại mật khẩu được.
pub const EMAIL_VERIFY: &str = "verify_email";
pub const PASSWORD_RESET: &str = "reset_password";

/// Claims của link trong mail. Không có `role` nên không dùng thay token đăng nhập được,
/// và token đăng nhập (không có `typ`) cũng không dùng thay link trong mail được.
/// `ver` = token_version lúc gửi: đặt lại mật khẩu xong thì version tăng, link cũ hết hiệu lực.
#[derive(Debug, Serialize, Deserialize)]
pub struct EmailClaims {
    pub sub: Uuid,
    pub typ: String,
    pub ver: i32,
    pub exp: usize,
    pub iat: usize,
}

pub fn create_email_token(
    user_id: Uuid,
    typ: &str,
    token_version: i32,
    secret: &str,
    minutes: i64,
) -> Result<String> {
    let now = Utc::now();
    let claims = EmailClaims {
        sub: user_id,
        typ: typ.to_string(),
        ver: token_version,
        exp: (now + Duration::minutes(minutes)).timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| anyhow!("JWT encode: {}", e))
}

pub fn verify_email_token(token: &str, typ: &str, secret: &str) -> Result<EmailClaims> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;
    validation.leeway = 0;

    let claims = decode::<EmailClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map(|d| d.claims)
    .map_err(|e| anyhow!("JWT verify: {}", e))?;

    if claims.typ != typ {
        return Err(anyhow!("JWT verify: wrong token type"));
    }
    Ok(claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEY: &str = "test-key";

    #[test]
    fn email_token_round_trip_checks_type() {
        let id = Uuid::new_v4();
        let t = create_email_token(id, EMAIL_VERIFY, 3, KEY, 10).unwrap();
        let c = verify_email_token(&t, EMAIL_VERIFY, KEY).unwrap();
        assert_eq!((c.sub, c.ver), (id, 3));
        assert!(verify_email_token(&t, PASSWORD_RESET, KEY).is_err());
    }

    #[test]
    fn access_and_email_tokens_are_not_interchangeable() {
        let id = Uuid::new_v4();
        let access = create_token(id, "user".into(), 0, KEY, 1).unwrap();
        let email = create_email_token(id, PASSWORD_RESET, 0, KEY, 10).unwrap();
        assert!(verify_email_token(&access, PASSWORD_RESET, KEY).is_err());
        assert!(verify_token(&email, KEY).is_err());
    }

    #[test]
    fn expired_email_token_is_rejected() {
        let t = create_email_token(Uuid::new_v4(), EMAIL_VERIFY, 0, KEY, -1).unwrap();
        assert!(verify_email_token(&t, EMAIL_VERIFY, KEY).is_err());
    }
}
