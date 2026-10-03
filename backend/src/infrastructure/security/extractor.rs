use actix_web::{
    Error, FromRequest, HttpMessage, HttpRequest, dev::Payload, error::ErrorUnauthorized,
};
use std::future::{Ready, ready};

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: i64,
    pub roles: Vec<String>,
}

impl AuthUser {
    pub fn is_admin(&self) -> bool {
        self.roles.iter().any(|r| r == "admin")
    }

    pub fn is_moderator(&self) -> bool {
        self.is_admin() || self.roles.iter().any(|r| r == "moderator")
    }

    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
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
