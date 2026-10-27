use std::sync::Arc;

use uuid::Uuid;

use crate::{
    domains::{
        follow::{error::FollowError, repository::FollowRepository},
        user::repository::UserRepository,
    },
    infrastructure::database::models::{entities::User, relations::follow::UserFollow},
};

pub struct FollowService {
    repo: Arc<dyn FollowRepository>,
    user_repo: Arc<dyn UserRepository>,
}

impl FollowService {
    pub fn new(repo: Arc<dyn FollowRepository>, user_repo: Arc<dyn UserRepository>) -> Self {
        Self { repo, user_repo }
    }

    pub fn follow(&self, follower_id: Uuid, following_id: Uuid) -> Result<UserFollow, FollowError> {
        if follower_id == following_id {
            return Err(FollowError::CannotFollowSelf);
        }
        self.user_repo
            .find_by_id(following_id)?
            .ok_or(FollowError::UserNotFound)?;
        if self.repo.is_following(follower_id, following_id)? {
            return Err(FollowError::AlreadyFollowing);
        }
        Ok(self.repo.follow(follower_id, following_id)?)
    }

    pub fn unfollow(&self, follower_id: Uuid, following_id: Uuid) -> Result<(), FollowError> {
        if !self.repo.is_following(follower_id, following_id)? {
            return Err(FollowError::NotFollowing);
        }
        Ok(self.repo.unfollow(follower_id, following_id)?)
    }

    pub fn list_followers(&self, user_id: Uuid) -> Result<Vec<User>, FollowError> {
        self.user_repo
            .find_by_id(user_id)?
            .ok_or(FollowError::UserNotFound)?;
        Ok(self.repo.list_followers(user_id)?)
    }

    pub fn list_following(&self, user_id: Uuid) -> Result<Vec<User>, FollowError> {
        self.user_repo
            .find_by_id(user_id)?
            .ok_or(FollowError::UserNotFound)?;
        Ok(self.repo.list_following(user_id)?)
    }

    pub fn stats(&self, user_id: Uuid) -> Result<(i64, i64), FollowError> {
        self.user_repo
            .find_by_id(user_id)?
            .ok_or(FollowError::UserNotFound)?;
        Ok((
            self.repo.follower_count(user_id)?,
            self.repo.following_count(user_id)?,
        ))
    }

    pub fn is_following(&self, follower_id: Uuid, following_id: Uuid) -> Result<bool, FollowError> {
        Ok(self.repo.is_following(follower_id, following_id)?)
    }
}
