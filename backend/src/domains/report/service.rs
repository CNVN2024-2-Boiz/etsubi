//! Báo cáo vi phạm cho bài viết, bình luận và người dùng.
//!
//! Không lưu vào cơ sở dữ liệu: mỗi báo cáo dựng thành một email gửi thẳng về hộp thư đội kiểm duyệt
//! (`REPORT_EMAIL`) qua Resend. Người báo cáo lấy từ JWT nên luôn biết ai đã gửi.

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use chrono::Utc;
use uuid::Uuid;

use crate::{
    domains::{
        comment::repository::CommentRepository, post::repository::PostRepository,
        report::error::ReportError, user::repository::UserRepository,
    },
    infrastructure::{
        database::models::entities::User,
        helper::mail::{
            Mailer,
            templates::{self, ReportMail, ReportPerson},
        },
    },
};

/// Lý do báo cáo bài viết: (mã gửi từ front end, nhãn tiếng Việt in trong mail).
pub const POST_REASONS: &[(&str, &str)] = &[
    ("spam", "Spam hoặc quảng cáo"),
    ("sexual", "Nội dung phản cảm, khiêu dâm"),
    ("hate", "Kích động vùng miền, phân biệt quốc tịch hoặc dân tộc"),
    ("harassment", "Quấy rối, xúc phạm người khác"),
    ("misinformation", "Thông tin sai sự thật"),
    ("violence", "Bạo lực hoặc nguy hiểm"),
    ("illegal", "Vi phạm pháp luật hoặc bản quyền"),
    ("other", "Lý do khác"),
];

/// Lý do báo cáo bình luận.
pub const COMMENT_REASONS: &[(&str, &str)] = &[
    ("spam", "Spam hoặc quảng cáo"),
    ("sexual", "Nội dung phản cảm, khiêu dâm"),
    ("hate", "Kích động vùng miền, phân biệt quốc tịch hoặc dân tộc"),
    ("harassment", "Quấy rối, xúc phạm người khác"),
    ("misinformation", "Thông tin sai sự thật"),
    ("off_topic", "Lạc đề, phá rối cuộc thảo luận"),
    ("other", "Lý do khác"),
];

/// Lý do báo cáo người dùng.
pub const USER_REASONS: &[(&str, &str)] = &[
    ("impersonation", "Giả mạo người khác"),
    ("spam", "Tài khoản spam hoặc quảng cáo"),
    ("harassment", "Quấy rối, đe doạ người khác"),
    ("hate", "Kích động thù ghét vùng miền, quốc tịch hoặc dân tộc"),
    ("inappropriate_profile", "Ảnh đại diện hoặc hồ sơ không phù hợp"),
    ("underage", "Có vẻ chưa đủ 16 tuổi"),
    ("other", "Lý do khác"),
];

/// Mô tả thêm tối đa 1000 ký tự.
pub const MAX_DETAILS: usize = 1000;
/// Cùng một người báo cáo lại cùng một đối tượng phải chờ 10 phút.
const SAME_TARGET_COOLDOWN: Duration = Duration::from_secs(10 * 60);
/// Mỗi người gửi tối đa 10 báo cáo mỗi giờ, để hộp thư kiểm duyệt không bị spam.
const HOURLY_LIMIT: usize = 10;
const HOUR: Duration = Duration::from_secs(60 * 60);

/// Dữ liệu báo cáo đã đọc từ request.
pub struct ReportInput {
    pub target_type: String,
    pub target_id: Uuid,
    pub reasons: Vec<String>,
    pub details: Option<String>,
}

/// Danh sách lý do hợp lệ theo loại đối tượng.
pub fn reasons_for(target_type: &str) -> Option<&'static [(&'static str, &'static str)]> {
    match target_type {
        "post" => Some(POST_REASONS),
        "comment" => Some(COMMENT_REASONS),
        "user" => Some(USER_REASONS),
        _ => None,
    }
}

/// Bỏ thẻ HTML của nội dung bài/bình luận để in trích đoạn chữ thuần trong mail.
pub fn html_to_text(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut in_tag = false;
    for ch in html.chars() {
        match ch {
            '<' => {
                in_tag = true;
                out.push(' ');
            }
            '>' if in_tag => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    let decoded = out
        .replace("&nbsp;", " ")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&amp;", "&");
    decoded.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Bộ đếm trong bộ nhớ chống gửi trùng và gửi dồn (mất khi khởi động lại, đủ cho đồ án).
#[derive(Default)]
struct Throttle {
    last_by_target: HashMap<(Uuid, Uuid), Instant>,
    recent_by_reporter: HashMap<Uuid, Vec<Instant>>,
}

pub struct ReportService {
    user_repo: Arc<dyn UserRepository>,
    post_repo: Arc<dyn PostRepository>,
    comment_repo: Arc<dyn CommentRepository>,
    mailer: Arc<dyn Mailer>,
    base_url: String,
    inbox: String,
    throttle: Mutex<Throttle>,
}

impl ReportService {
    pub fn new(
        user_repo: Arc<dyn UserRepository>,
        post_repo: Arc<dyn PostRepository>,
        comment_repo: Arc<dyn CommentRepository>,
        mailer: Arc<dyn Mailer>,
        base_url: String,
        inbox: String,
    ) -> Self {
        Self {
            user_repo,
            post_repo,
            comment_repo,
            mailer,
            base_url,
            inbox,
            throttle: Mutex::new(Throttle::default()),
        }
    }

    /// Kiểm tra báo cáo, dựng mail và gửi về hộp thư kiểm duyệt.
    pub fn submit(&self, reporter_id: Uuid, input: ReportInput) -> Result<(), ReportError> {
        let allowed = reasons_for(&input.target_type).ok_or(ReportError::InvalidTarget)?;

        // Lý do: ít nhất một, đều thuộc danh sách của loại đối tượng, bỏ trùng và giữ thứ tự danh sách.
        if input.reasons.is_empty()
            || input
                .reasons
                .iter()
                .any(|r| !allowed.iter().any(|(code, _)| code == r))
        {
            return Err(ReportError::InvalidReason);
        }
        let labels: Vec<&'static str> = allowed
            .iter()
            .filter(|(code, _)| input.reasons.iter().any(|r| r == code))
            .map(|(_, label)| *label)
            .collect();

        // Mô tả thêm: bắt buộc khi chọn "Lý do khác", tối đa 1000 ký tự.
        let details = input
            .details
            .map(|d| d.trim().to_string())
            .filter(|d| !d.is_empty());
        if details.as_ref().is_some_and(|d| d.chars().count() > MAX_DETAILS) {
            return Err(ReportError::DetailsTooLong);
        }
        if input.reasons.iter().any(|r| r == "other") && details.is_none() {
            return Err(ReportError::DetailsRequired);
        }

        let reporter = self
            .user_repo
            .find_by_id(reporter_id)?
            .ok_or(ReportError::ReporterNotFound)?;

        let mut mail = ReportMail {
            target_type: match input.target_type.as_str() {
                "post" => "post",
                "comment" => "comment",
                _ => "user",
            },
            reasons: labels,
            details,
            reporter: person(&reporter, true),
            target_id: input.target_id.to_string(),
            target_title: String::new(),
            target_excerpt: None,
            target_author: None,
            target_context: None,
            target_url: String::new(),
            at: Utc::now(),
        };
        self.fill_target(reporter_id, input.target_id, &mut mail)?;

        self.check_throttle(reporter_id, input.target_id)?;
        self.mailer
            .send(templates::report_received(&self.base_url, &self.inbox, &mail));
        Ok(())
    }

    /// Đọc đối tượng bị báo cáo từ cơ sở dữ liệu (không tin dữ liệu front end gửi lên).
    fn fill_target(
        &self,
        reporter_id: Uuid,
        target_id: Uuid,
        mail: &mut ReportMail,
    ) -> Result<(), ReportError> {
        let base = &self.base_url;
        match mail.target_type {
            "post" => {
                let post = self
                    .post_repo
                    .find_by_id(target_id)?
                    .filter(|p| p.deleted_at.is_none())
                    .ok_or(ReportError::TargetNotFound)?;
                if post.author_id == reporter_id {
                    return Err(ReportError::CannotReportSelf);
                }
                mail.target_title = templates::clip(&post.title, 200);
                mail.target_excerpt = Some(templates::clip(&html_to_text(&post.content), 280))
                    .filter(|s| !s.is_empty());
                mail.target_author = self.user_repo.find_by_id(post.author_id)?.map(|u| person(&u, false));
                mail.target_url = format!("{base}/post/?id={}", post.id);
            }
            "comment" => {
                let comment = self
                    .comment_repo
                    .find_by_id(target_id)?
                    .filter(|c| c.deleted_at.is_none())
                    .ok_or(ReportError::TargetNotFound)?;
                if comment.user_id == reporter_id {
                    return Err(ReportError::CannotReportSelf);
                }
                let text = html_to_text(&comment.content);
                mail.target_title = templates::clip(&text, 80);
                mail.target_excerpt = Some(templates::clip(&text, 280)).filter(|s| !s.is_empty());
                mail.target_author = self.user_repo.find_by_id(comment.user_id)?.map(|u| person(&u, false));
                mail.target_context = self
                    .post_repo
                    .find_by_id(comment.post_id)?
                    .map(|p| templates::clip(&p.title, 200));
                mail.target_url = format!("{base}/post/?id={}#comment-{}", comment.post_id, comment.id);
            }
            _ => {
                if target_id == reporter_id {
                    return Err(ReportError::CannotReportSelf);
                }
                let user = self
                    .user_repo
                    .find_by_id(target_id)?
                    .ok_or(ReportError::TargetNotFound)?;
                mail.target_title = user.displayname.clone();
                mail.target_excerpt = user
                    .bio
                    .as_deref()
                    .map(|b| templates::clip(b, 280))
                    .filter(|s| !s.is_empty());
                mail.target_author = Some(person(&user, false));
                mail.target_url = format!("{base}/profile/?id={}", user.id);
            }
        }
        Ok(())
    }

    /// Chặn báo cáo lặp lại cùng đối tượng trong 10 phút và quá 10 báo cáo mỗi giờ.
    fn check_throttle(&self, reporter_id: Uuid, target_id: Uuid) -> Result<(), ReportError> {
        let now = Instant::now();
        let mut t = self
            .throttle
            .lock()
            .map_err(|_| anyhow::anyhow!("report throttle lock poisoned"))?;

        // Dọn mốc cũ để bộ nhớ không tăng mãi.
        t.last_by_target
            .retain(|_, at| now.duration_since(*at) < SAME_TARGET_COOLDOWN);
        t.recent_by_reporter.retain(|_, list| {
            list.retain(|at| now.duration_since(*at) < HOUR);
            !list.is_empty()
        });

        if t.last_by_target.contains_key(&(reporter_id, target_id)) {
            return Err(ReportError::Cooldown);
        }
        if t.recent_by_reporter
            .get(&reporter_id)
            .is_some_and(|list| list.len() >= HOURLY_LIMIT)
        {
            return Err(ReportError::TooManyReports);
        }
        t.last_by_target.insert((reporter_id, target_id), now);
        t.recent_by_reporter.entry(reporter_id).or_default().push(now);
        Ok(())
    }
}

/// Chuyển tài khoản sang dạng in trong mail; chỉ người báo cáo kèm email.
fn person(user: &User, with_email: bool) -> ReportPerson {
    ReportPerson {
        id: user.id.to_string(),
        displayname: user.displayname.clone(),
        username: user.username.clone(),
        email: with_email.then(|| user.email.clone()),
        role: user.role.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn html_to_text_strips_tags_and_entities() {
        assert_eq!(
            html_to_text("<p>Xin&nbsp;chào <b>bạn</b></p><p>A &amp; B</p>"),
            "Xin chào bạn A & B"
        );
    }

    #[test]
    fn every_target_has_other_reason() {
        for t in ["post", "comment", "user"] {
            assert!(reasons_for(t).unwrap().iter().any(|(c, _)| *c == "other"));
        }
        assert!(reasons_for("tag").is_none());
    }
}
