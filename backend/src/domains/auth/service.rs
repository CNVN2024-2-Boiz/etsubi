use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    domains::{
        auth::{
            consent::{
                ConsentInput, PRIVACY_VERSION, PURPOSE_PERSONAL_DATA, PURPOSE_TERMS, TERMS_VERSION,
            },
            error::AuthError,
            repository::AuthRepository,
        },
        user::repository::UserRepository,
    },
    infrastructure::{
        database::models::entities::{ConsentRecord, NewConsent, User},
        helper::{
            auth::{
                jwt::{
                    EMAIL_VERIFY, PASSWORD_RESET, create_email_token, create_token,
                    verify_email_token,
                },
                password::{hash_password, verify_password},
            },
            mail::{
                Mailer,
                templates::{self, ConsentSummary, Lang},
            },
        },
    },
};

const MIN_USERNAME_LEN: usize = 3;
const MIN_PASSWORD_LEN: usize = 8;
const MAX_DISPLAYNAME_CHARS: usize = 50;
const VALID_LANGUAGES: &[&str] = &["vi", "en", "ja"];

/// Link xác nhận email dùng được trong 24 giờ, link đặt lại mật khẩu trong 30 phút.
const VERIFY_LINK_MINUTES: i64 = 24 * 60;
const RESET_LINK_MINUTES: i64 = 30;
/// Mỗi địa chỉ chỉ nhận một mail cùng loại mỗi 60 giây (chống spam hộp thư người khác).
const MAIL_COOLDOWN: Duration = Duration::from_secs(60);

pub struct AuthService {
    auth_repo: Arc<dyn AuthRepository>,
    user_repo: Arc<dyn UserRepository>,
    jwt_key: String,
    jwt_expiry_hours: i64,
    mailer: Arc<dyn Mailer>,
    app_base_url: String,
    last_mail: Mutex<HashMap<(String, &'static str), Instant>>,
}

impl AuthService {
    pub fn new(
        auth_repo: Arc<dyn AuthRepository>,
        user_repo: Arc<dyn UserRepository>,
        jwt_key: String,
        jwt_expiry_hours: i64,
        mailer: Arc<dyn Mailer>,
        app_base_url: String,
    ) -> Self {
        Self {
            auth_repo,
            user_repo,
            jwt_key,
            jwt_expiry_hours,
            mailer,
            app_base_url,
            last_mail: Mutex::new(HashMap::new()),
        }
    }

    /// true nếu được gửi mail loại `kind` tới `email` lúc này (và ghi lại thời điểm gửi).
    fn mail_allowed(&self, email: &str, kind: &'static str) -> bool {
        let Ok(mut map) = self.last_mail.lock() else {
            return true;
        };
        let now = Instant::now();
        map.retain(|_, at| now.duration_since(*at) < MAIL_COOLDOWN);
        let key = (email.to_lowercase(), kind);
        if map.contains_key(&key) {
            return false;
        }
        map.insert(key, now);
        true
    }

    fn send_verification(&self, user: &User, granted_at: DateTime<Utc>) -> Result<(), AuthError> {
        let token = create_email_token(
            user.id,
            EMAIL_VERIFY,
            user.token_version,
            &self.jwt_key,
            VERIFY_LINK_MINUTES,
        )?;
        let link = format!("{}/verify-email/?token={}", self.app_base_url, token);
        self.mailer.send(templates::verify_email(
            Lang::from_code(&user.language),
            &self.app_base_url,
            &user.email,
            &user.displayname,
            &user.username,
            &link,
            &ConsentSummary {
                terms_version: TERMS_VERSION.into(),
                privacy_version: PRIVACY_VERSION.into(),
                granted_at,
            },
        ));
        Ok(())
    }

    fn send_password_changed(&self, user: &User) {
        self.mailer.send(templates::password_changed(
            Lang::from_code(&user.language),
            &self.app_base_url,
            &user.email,
            &user.username,
            Utc::now(),
        ));
    }

    pub fn register(
        &self,
        username: &str,
        email: &str,
        displayname: Option<&str>,
        native: &str,
        language: &str,
        password: &str,
        consent: ConsentInput,
    ) -> Result<User, AuthError> {
        // Hai ô đồng ý ở trang đăng ký là bắt buộc (Luật 91/2025/QH15).
        if !consent.accept_terms || !consent.accept_privacy {
            return Err(AuthError::ConsentRequired);
        }
        if username.len() < MIN_USERNAME_LEN {
            return Err(AuthError::UsernameTooShort);
        }
        if password.len() < MIN_PASSWORD_LEN {
            return Err(AuthError::WeakPassword);
        }
        if !VALID_LANGUAGES.contains(&native) {
            return Err(AuthError::InvalidLanguage);
        }
        if !VALID_LANGUAGES.contains(&language) {
            return Err(AuthError::InvalidLanguage);
        }

        let uname_len = username.chars().count();
        if !(3..=30).contains(&uname_len)
            || !username
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
        {
            return Err(AuthError::InvalidUsername);
        }

        let displayname = displayname
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .unwrap_or(username);

        if displayname.chars().count() > MAX_DISPLAYNAME_CHARS {
            return Err(AuthError::DisplaynameTooLong);
        }

        if self.user_repo.find_by_email(email)?.is_some() {
            return Err(AuthError::EmailAlreadyExists);
        }
        if self.user_repo.find_by_username(username)?.is_some() {
            return Err(AuthError::UsernameAlreadyTaken);
        }

        let hashed = hash_password(password)?;
        let now = Utc::now();
        let user = User {
            id: Uuid::nil(),
            displayname: displayname.to_string(),
            username: username.into(),
            email: email.into(),
            institute: None,
            address: None,
            password: Some(hashed),
            native: native.into(),
            language: language.into(),
            avatar_url: None,
            bio: None,
            role: "user".into(),
            // Chưa bấm link trong mail thì chưa đăng nhập được.
            status: "pending".into(),
            created_at: now,
            updated_at: now,
            muted_until: None,
            token_version: 0,
            oauth_provider: None,
            oauth_subject: None,
            profile_completed_at: None,
        };

        let consents = [
            (PURPOSE_TERMS, TERMS_VERSION),
            (PURPOSE_PERSONAL_DATA, PRIVACY_VERSION),
        ]
        .map(|(purpose, version)| NewConsent {
            purpose: purpose.into(),
            document_version: version.into(),
            ip_address: consent.ip_address.clone(),
            user_agent: consent.user_agent.clone(),
        });

        let created = self.auth_repo.create(&user, &consents)?;
        self.mail_allowed(&created.email, EMAIL_VERIFY);
        self.send_verification(&created, created.created_at)?;
        Ok(created)
    }

    pub fn login(&self, email: &str, password: &str) -> Result<(User, String), AuthError> {
        let user = self
            .user_repo
            .find_by_email(email)?
            .ok_or(AuthError::InvalidCredentials)?;

        let stored = user
            .password
            .as_deref()
            .ok_or(AuthError::InvalidCredentials)?;

        if !verify_password(password, stored) {
            return Err(AuthError::InvalidCredentials);
        }

        match user.status.as_str() {
            "banned" => return Err(AuthError::AccountBanned),
            "pending" => return Err(AuthError::EmailNotVerified),
            _ => {}
        }

        let token = create_token(
            user.id,
            user.role.clone(),
            user.token_version,
            &self.jwt_key,
            self.jwt_expiry_hours,
        )?;

        Ok((user, token))
    }

    pub fn authenticate(&self, token: &str) -> Result<User, AuthError> {
        let claims = crate::infrastructure::helper::auth::jwt::verify_token(token, &self.jwt_key)
            .map_err(|_| AuthError::InvalidToken)?;

        let user = self
            .user_repo
            .find_by_id(claims.sub)?
            .ok_or(AuthError::UserNotFound)?;

        if claims.ver != user.token_version {
            return Err(AuthError::InvalidToken);
        }

        match user.status.as_str() {
            "active" => Ok(user),
            "banned" => Err(AuthError::AccountBanned),
            _ => Err(AuthError::InvalidToken),
        }
    }

    pub fn logout(&self, user_id: Uuid) -> Result<(), AuthError> {
        self.user_repo
            .find_by_id(user_id)?
            .ok_or(AuthError::UserNotFound)?;

        self.auth_repo.increment_token_version(user_id)?;
        Ok(())
    }

    pub fn change_password(
        &self,
        user_id: Uuid,
        current_password: &str,
        new_password: &str,
    ) -> Result<(), AuthError> {
        let user = self
            .user_repo
            .find_by_id(user_id)?
            .ok_or(AuthError::UserNotFound)?;

        let stored = user
            .password
            .as_deref()
            .ok_or(AuthError::InvalidCredentials)?;

        if !verify_password(current_password, stored) {
            return Err(AuthError::InvalidCredentials);
        }

        if new_password.len() < MIN_PASSWORD_LEN {
            return Err(AuthError::WeakPassword);
        }

        let hashed = hash_password(new_password)?;
        self.auth_repo.update_password(user_id, &hashed)?;
        self.auth_repo.increment_token_version(user_id)?;
        self.send_password_changed(&user);
        Ok(())
    }

    /// Bấm link xác nhận: tài khoản 'pending' chuyển sang 'active' và đăng nhập luôn.
    pub fn verify_email(&self, token: &str) -> Result<(User, String), AuthError> {
        let claims = verify_email_token(token, EMAIL_VERIFY, &self.jwt_key)
            .map_err(|_| AuthError::InvalidLink)?;
        let user = self
            .user_repo
            .find_by_id(claims.sub)?
            .ok_or(AuthError::InvalidLink)?;
        if claims.ver != user.token_version {
            return Err(AuthError::InvalidLink);
        }

        match user.status.as_str() {
            "banned" => return Err(AuthError::AccountBanned),
            "active" => return Err(AuthError::AlreadyVerified),
            _ => {}
        }
        if !self.auth_repo.activate(user.id)? {
            return Err(AuthError::AlreadyVerified);
        }

        let token = create_token(
            user.id,
            user.role.clone(),
            user.token_version,
            &self.jwt_key,
            self.jwt_expiry_hours,
        )?;
        let user = self
            .user_repo
            .find_by_id(user.id)?
            .ok_or(AuthError::UserNotFound)?;
        Ok((user, token))
    }

    /// Gửi lại mail xác nhận. Luôn trả Ok để không lộ email nào đã đăng ký.
    pub fn resend_verification(&self, email: &str) -> Result<(), AuthError> {
        let Some(user) = self.user_repo.find_by_email(email.trim())? else {
            return Ok(());
        };
        if user.status != "pending" || !self.mail_allowed(&user.email, EMAIL_VERIFY) {
            return Ok(());
        }
        let granted_at = self
            .auth_repo
            .list_consents(user.id)?
            .first()
            .map(|c| c.granted_at)
            .unwrap_or(user.created_at);
        self.send_verification(&user, granted_at)
    }

    /// Quên mật khẩu: gửi link đặt lại. Luôn trả Ok để không lộ email nào đã đăng ký.
    pub fn forgot_password(&self, email: &str) -> Result<(), AuthError> {
        let Some(user) = self.user_repo.find_by_email(email.trim())? else {
            return Ok(());
        };
        if user.status == "banned" || !self.mail_allowed(&user.email, PASSWORD_RESET) {
            return Ok(());
        }
        let token = create_email_token(
            user.id,
            PASSWORD_RESET,
            user.token_version,
            &self.jwt_key,
            RESET_LINK_MINUTES,
        )?;
        let link = format!("{}/reset-password/?token={}", self.app_base_url, token);
        self.mailer.send(templates::reset_password(
            Lang::from_code(&user.language),
            &self.app_base_url,
            &user.email,
            &user.username,
            &link,
        ));
        Ok(())
    }

    /// Đặt mật khẩu mới từ link trong mail. Đổi xong thì token_version tăng nên link
    /// này và mọi phiên đăng nhập cũ hết hiệu lực. Tài khoản 'pending' cũng được kích hoạt
    /// vì người dùng đã chứng minh mở được hộp thư.
    pub fn reset_password(&self, token: &str, new_password: &str) -> Result<(), AuthError> {
        let claims = verify_email_token(token, PASSWORD_RESET, &self.jwt_key)
            .map_err(|_| AuthError::InvalidLink)?;
        let user = self
            .user_repo
            .find_by_id(claims.sub)?
            .ok_or(AuthError::InvalidLink)?;
        if claims.ver != user.token_version {
            return Err(AuthError::InvalidLink);
        }
        if user.status == "banned" {
            return Err(AuthError::AccountBanned);
        }
        if new_password.len() < MIN_PASSWORD_LEN {
            return Err(AuthError::WeakPassword);
        }

        let hashed = hash_password(new_password)?;
        self.auth_repo.update_password(user.id, &hashed)?;
        self.auth_repo.increment_token_version(user.id)?;
        if user.status == "pending" {
            self.auth_repo.activate(user.id)?;
        }
        self.send_password_changed(&user);
        Ok(())
    }

    pub fn list_consents(&self, user_id: Uuid) -> Result<Vec<ConsentRecord>, AuthError> {
        Ok(self.auth_repo.list_consents(user_id)?)
    }

    pub fn delete_account(&self, user_id: Uuid, password: &str) -> Result<(), AuthError> {
        let user = self
            .user_repo
            .find_by_id(user_id)?
            .ok_or(AuthError::UserNotFound)?;

        let stored = user
            .password
            .as_deref()
            .ok_or(AuthError::InvalidCredentials)?;

        if !verify_password(password, stored) {
            return Err(AuthError::InvalidCredentials);
        }

        if user.role == "admin" {
            return Err(AuthError::CannotDeleteAdmin);
        }

        self.auth_repo.delete(user_id)?;
        Ok(())
    }
}
