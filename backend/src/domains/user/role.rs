use crate::domains::user::error::UserError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Role {
    User,
    Moderator,
    Admin,
}

impl Role {
    pub fn parse(s: &str) -> Result<Self, UserError> {
        match s {
            "user" => Ok(Role::User),
            "moderator" => Ok(Role::Moderator),
            "admin" => Ok(Role::Admin),
            _ => Err(UserError::Internal(anyhow::anyhow!(
                "Invalid role in DB: {}",
                s
            ))),
        }
    }
}
