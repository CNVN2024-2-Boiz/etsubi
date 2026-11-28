//! Báo cáo vi phạm (`POST /reports`): kiểm tra dữ liệu, chặn tự báo cáo, chống gửi dồn và mail gửi về hộp thư kiểm duyệt.
//! Test chạy không có RESEND_API_KEY nên mail nằm trong outbox của LogMailer.
//! Chỉ test `report_is_emailed_to_moderators` đọc outbox, để các test chạy song song không lấy mất mail của nhau.

use backend::infrastructure::helper::mail::take_outbox;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::common::{TestServer, TestUser, register_and_login};

/// Hộp thư nhận báo cáo khi test không đặt `REPORT_EMAIL`.
fn inbox() -> String {
    std::env::var("REPORT_EMAIL")
        .ok()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "contact@etsubi.net".into())
}

fn create_post(user: &TestUser, server: &TestServer, title: &str) -> String {
    let r = user
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user.token)
        .json(&json!({"title": title, "content": "<p>Nội dung&nbsp;<b>bài</b></p>"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201, "create post: {:?}", r.text());
    r.json::<Value>().unwrap()["id"].as_str().unwrap().to_string()
}

fn create_comment(user: &TestUser, server: &TestServer, post_id: &str, content: &str) -> String {
    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{post_id}/comments")))
        .bearer_auth(&user.token)
        .json(&json!({"content": content}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201, "create comment: {:?}", r.text());
    r.json::<Value>().unwrap()["id"].as_str().unwrap().to_string()
}

/// Gửi báo cáo; trả mã HTTP và `code` lỗi (nếu có).
fn report(user: &TestUser, server: &TestServer, body: Value) -> (u16, Option<String>) {
    let r = user
        .client
        .post(server.url("/api/v1/reports"))
        .bearer_auth(&user.token)
        .json(&body)
        .send()
        .unwrap();
    let status = r.status().as_u16();
    let code = r
        .json::<Value>()
        .ok()
        .and_then(|v| v["code"].as_str().map(str::to_string));
    (status, code)
}

fn set_muted_in_db(email: &str) {
    use backend::infrastructure::database::schema::users;
    use diesel::prelude::*;

    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let pool = backend::bootstrap::pool::init(&url);
    let mut conn = pool.get().unwrap();
    diesel::update(users::table.filter(users::email.eq(email)))
        .set(users::muted_until.eq(chrono::Utc::now() + chrono::Duration::days(1)))
        .execute(&mut conn)
        .expect("set muted_until failed");
}

#[test]
fn report_requires_sign_in() {
    let server = TestServer::start();
    let r = reqwest::blocking::Client::new()
        .post(server.url("/api/v1/reports"))
        .json(&json!({"target_type": "user", "target_id": Uuid::new_v4(), "reasons": ["spam"]}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn report_is_emailed_to_moderators() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let reporter = register_and_login(&server.base);
    let marker = Uuid::new_v4().simple().to_string();
    let post_id = create_post(&author, &server, &format!("Bài thử {marker} {{{{content}}}}"));
    let comment_id = create_comment(&author, &server, &post_id, &format!("<p>Bình luận {marker}</p>"));

    // Bài viết: hai lý do, mô tả có thẻ HTML phải được thoát.
    assert_eq!(
        report(&reporter, &server, json!({
            "target_type": "post", "target_id": post_id, "reasons": ["hate", "spam"],
            "details": "  <b>vùng miền</b>\ndòng 2  ",
        })),
        (204, None)
    );
    // Bình luận với "Lý do khác" có mô tả.
    assert_eq!(
        report(&reporter, &server, json!({
            "target_type": "comment", "target_id": comment_id, "reasons": ["other"], "details": "Phá rối",
        })),
        (204, None)
    );
    // Người dùng.
    assert_eq!(
        report(&reporter, &server, json!({
            "target_type": "user", "target_id": author.id, "reasons": ["impersonation"],
        })),
        (204, None)
    );

    let mails: Vec<_> = take_outbox(&inbox())
        .into_iter()
        .filter(|m| m.text.contains(&reporter.email))
        .collect();
    assert_eq!(mails.len(), 3, "one mail per report");

    let post_mail = mails.iter().find(|m| m.subject.starts_with("[Báo cáo] Bài viết:")).unwrap();
    assert!(post_mail.subject.contains(&marker));
    // Người báo cáo lấy từ JWT; bấm Trả lời là gửi thẳng cho họ.
    assert_eq!(post_mail.reply_to.as_deref(), Some(reporter.email.as_str()));
    assert!(post_mail.html.contains(&reporter.id.to_string()));
    // Lý do theo thứ tự danh sách của máy chủ, không theo thứ tự gửi lên.
    assert!(post_mail.text.contains("Lý do: Spam hoặc quảng cáo, Kích động vùng miền"));
    assert!(post_mail.html.contains("&lt;b&gt;vùng miền&lt;/b&gt;<br>dòng 2"));
    assert!(!post_mail.html.contains("{{"), "user text must not become a layout placeholder");
    assert!(post_mail.html.contains(&format!("/post/?id={post_id}")));
    // Email của tác giả bài không lộ trong mail kiểm duyệt.
    assert!(!post_mail.html.contains(&author.email));

    let comment_mail = mails.iter().find(|m| m.subject.starts_with("[Báo cáo] Bình luận:")).unwrap();
    assert!(comment_mail.html.contains(&format!("#comment-{comment_id}")));
    assert!(comment_mail.text.contains("Mô tả thêm: Phá rối"));

    let user_mail = mails.iter().find(|m| m.subject.starts_with("[Báo cáo] Người dùng:")).unwrap();
    assert!(user_mail.html.contains(&format!("/profile/?id={}", author.id)));
}

#[test]
fn report_rejects_invalid_input() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let reporter = register_and_login(&server.base);
    let post_id = create_post(&author, &server, "Bài để kiểm tra lỗi");

    let cases = [
        (json!({"target_type": "tag", "target_id": post_id, "reasons": ["spam"]}), 400, "invalid_target"),
        (json!({"target_type": "post", "target_id": post_id, "reasons": []}), 400, "invalid_reason"),
        // off_topic chỉ dành cho bình luận.
        (json!({"target_type": "post", "target_id": post_id, "reasons": ["off_topic"]}), 400, "invalid_reason"),
        (json!({"target_type": "post", "target_id": post_id, "reasons": ["other"], "details": "   "}), 400, "details_required"),
        (json!({"target_type": "post", "target_id": post_id, "reasons": ["spam"], "details": "ấ".repeat(1001)}), 400, "details_too_long"),
        (json!({"target_type": "post", "target_id": Uuid::new_v4(), "reasons": ["spam"]}), 404, "target_not_found"),
        (json!({"target_type": "comment", "target_id": Uuid::new_v4(), "reasons": ["spam"]}), 404, "target_not_found"),
        (json!({"target_type": "user", "target_id": Uuid::new_v4(), "reasons": ["spam"]}), 404, "target_not_found"),
    ];
    for (body, status, code) in cases {
        assert_eq!(report(&reporter, &server, body.clone()), (status, Some(code.to_string())), "{body}");
    }
    // Đúng 1000 ký tự (đếm theo ký tự, không theo byte) vẫn hợp lệ.
    assert_eq!(
        report(&reporter, &server, json!({"target_type": "post", "target_id": post_id, "reasons": ["spam"], "details": "ấ".repeat(1000)})),
        (204, None)
    );
}

#[test]
fn report_blocks_own_content() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let post_id = create_post(&author, &server, "Bài của chính mình");
    let comment_id = create_comment(&author, &server, &post_id, "Bình luận của chính mình");

    for (kind, id) in [("post", post_id), ("comment", comment_id), ("user", author.id.to_string())] {
        assert_eq!(
            report(&author, &server, json!({"target_type": kind, "target_id": id, "reasons": ["spam"]})),
            (400, Some("cannot_report_self".into())),
            "{kind}"
        );
    }
}

#[test]
fn report_cooldown_and_hourly_limit() {
    let server = TestServer::start();
    let reporter = register_and_login(&server.base);
    let targets: Vec<TestUser> = (0..11).map(|_| register_and_login(&server.base)).collect();
    let body = |t: &TestUser| json!({"target_type": "user", "target_id": t.id, "reasons": ["spam"]});

    assert_eq!(report(&reporter, &server, body(&targets[0])), (204, None));
    // Cùng đối tượng trong 10 phút: 409 (không dùng 429 vì client.js tự gửi lại 429).
    assert_eq!(report(&reporter, &server, body(&targets[0])), (409, Some("report_cooldown".into())));

    for t in &targets[1..10] {
        assert_eq!(report(&reporter, &server, body(t)), (204, None));
    }
    // Báo cáo thứ 11 trong một giờ bị chặn.
    assert_eq!(report(&reporter, &server, body(&targets[10])), (409, Some("report_limit".into())));
}

#[test]
fn muted_user_can_still_report() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let muted = register_and_login(&server.base);
    let post_id = create_post(&author, &server, "Bài cho người bị tắt tiếng");
    set_muted_in_db(&muted.email);

    // Báo cáo vẫn gửi được, nhưng bình luận thì bị chặn.
    assert_eq!(
        report(&muted, &server, json!({"target_type": "post", "target_id": post_id, "reasons": ["spam"]})),
        (204, None)
    );
    let r = muted
        .client
        .post(server.url(&format!("/api/v1/posts/{post_id}/comments")))
        .bearer_auth(&muted.token)
        .json(&json!({"content": "x"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);
}
