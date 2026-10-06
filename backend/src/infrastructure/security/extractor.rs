use actix_web::{
    Error, FromRequest, HttpMessage, HttpRequest, dev::Payload, error::ErrorUnauthorized,
};
use chrono::{DateTime, Utc};
use std::future::{Ready, ready};

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: i64,
    pub role: String,
    pub status: String,
    pub muted_until: Option<DateTime<Utc>>,
}

impl AuthUser {
    pub fn has_role(&self, role: &str) -> bool {
        self.role == role
    }

    pub fn is_user(&self) -> bool {
        self.has_role("user")
    }

    pub fn is_staff(&self) -> bool {
        self.is_admin() || self.has_role("moderator")
    }

    pub fn is_admin(&self) -> bool {
        self.has_role("admin")
    }
}

impl FromRequest for AuthUser {
    type Error = Error;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        ready(
            req.extensions()
                .get::<AuthUser>()
                .cloned()
                .ok_or_else(|| ErrorUnauthorized("Not authenticated")),
        )
    }
}
