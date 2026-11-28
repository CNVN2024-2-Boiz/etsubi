//! Đăng ký có bằng chứng đồng ý, xác nhận email bắt buộc, quên và đặt lại mật khẩu.
//! Test chạy không có RESEND_API_KEY nên mail nằm trong outbox của LogMailer.

use backend::infrastructure::helper::mail::{OutgoingMail, take_outbox};
use reqwest::blocking::Client;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::common::{TestServer, cleanup_user};

struct Account {
    email: String,
    password: String,
}

impl Drop for Account {
    fn drop(&mut self) {
        cleanup_user(&self.email);
    }
}

fn register(server: &TestServer, client: &Client, language: &str) -> Account {
    let uid = Uuid::new_v4();
    let email = format!("test+{}@example.com", uid);
    let password = "password123".to_string();
    let r = client
        .post(server.url("/api/v1/auth/register"))
        .header("User-Agent", "etsubi-test/1.0")
        .json(&json!({
            "username": format!("test_{}", &uid.simple().to_string()[..12]),
            "displayname": "Người <b>thử</b>",
            "email": email,
            "password": password,
            "native": language,
            "language": language,
            "accept_terms": true,
            "accept_privacy": true,
        }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201, "register: {:?}", r.text());
    assert_eq!(r.json::<Value>().unwrap()["status"], "pending");
    Account { email, password }
}

/// Lấy token trong link `.../<path>/?token=...` của mail.
fn token_from(mail: &OutgoingMail, path: &str) -> String {
    let marker = format!("{path}/?token=");
    let start = mail.text.find(&marker).expect("link in mail") + marker.len();
    mail.text[start..]
        .split(|c: char| c.is_whitespace())
        .next()
        .unwrap()
        .to_string()
}

fn login(server: &TestServer, client: &Client, email: &str, password: &str) -> reqwest::blocking::Response {
    client
        .post(server.url("/api/v1/auth/login"))
        .json(&json!({ "email": email, "password": password }))
        .send()
        .unwrap()
}

#[test]
fn register_requires_both_consents() {
    let server = TestServer::start();
    let client = Client::new();
    for (terms, privacy) in [(false, true), (true, false), (false, false)] {
        let uid = Uuid::new_v4();
        let email = format!("test+{}@example.com", uid);
        let r = client
            .post(server.url("/api/v1/auth/register"))
            .json(&json!({
                "username": format!("test_{}", &uid.simple().to_string()[..12]),
                "email": email,
                "password": "password123",
                "native": "vi",
                "language": "vi",
                "accept_terms": terms,
                "accept_privacy": privacy,
            }))
            .send()
            .unwrap();
        assert_eq!(r.status(), 400);
        assert_eq!(r.json::<Value>().unwrap()["code"], "consent_required");
        cleanup_user(&email);
    }
}

#[test]
fn pending_account_must_verify_email_before_login() {
    let server = TestServer::start();
    let client = Client::new();
    let acc = register(&server, &client, "ja");

    // Chưa xác nhận: đăng nhập bị chặn với mã riêng để frontend hiện nút gửi lại mail.
    let r = login(&server, &client, &acc.email, &acc.password);
    assert_eq!(r.status(), 403);
    assert_eq!(r.json::<Value>().unwrap()["code"], "email_not_verified");

    // Mail xác nhận theo ngôn ngữ người dùng, tên hiển thị đã được thoát HTML.
    let mails = take_outbox(&acc.email);
    assert_eq!(mails.len(), 1);
    let mail = &mails[0];
    assert!(mail.subject.contains("Etsubi"));
    assert!(mail.html.contains("lang=\"ja\""));
    assert!(mail.html.contains("&lt;b&gt;thử&lt;/b&gt;"));
    let token = token_from(mail, "verify-email");

    // Gửi lại ngay sau khi đăng ký: bị giới hạn 60 giây nên không có mail mới.
    let r = client
        .post(server.url("/api/v1/auth/resend-verification"))
        .json(&json!({ "email": acc.email }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 202);
    assert!(take_outbox(&acc.email).is_empty());

    // Link sai loại hoặc hỏng không dùng được.
    let r = client
        .post(server.url("/api/v1/auth/verify-email"))
        .json(&json!({ "token": "not-a-token" }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 400);
    assert_eq!(r.json::<Value>().unwrap()["code"], "invalid_link");

    // Bấm link: tài khoản kích hoạt và nhận luôn token đăng nhập.
    let r = client
        .post(server.url("/api/v1/auth/verify-email"))
        .json(&json!({ "token": token }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200, "verify: {:?}", r.text());
    let access = r.json::<Value>().unwrap()["token"].as_str().unwrap().to_string();

    // Link xác nhận không dùng thay token đăng nhập được.
    let r = client
        .get(server.url("/api/v1/my"))
        .bearer_auth(&token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);

    // Bấm lại link lần nữa: đã xác nhận rồi.
    let r = client
        .post(server.url("/api/v1/auth/verify-email"))
        .json(&json!({ "token": token }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 409);

    assert_eq!(login(&server, &client, &acc.email, &acc.password).status(), 200);

    // Bằng chứng đồng ý: hai bản ghi, đúng phiên bản văn bản.
    let r = client
        .get(server.url("/api/v1/my/consents"))
        .bearer_auth(&access)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let consents: Vec<Value> = r.json().unwrap();
    let mut purposes: Vec<&str> = consents.iter().map(|c| c["purpose"].as_str().unwrap()).collect();
    purposes.sort();
    assert_eq!(purposes, ["personal_data", "terms_of_use"]);
    assert!(consents.iter().all(|c| !c["document_version"].as_str().unwrap().is_empty()));
}

#[test]
fn consent_records_keep_origin_of_request() {
    use backend::infrastructure::database::schema::{consent_records, users};
    use diesel::prelude::*;

    let server = TestServer::start();
    let client = Client::new();
    let acc = register(&server, &client, "vi");
    take_outbox(&acc.email);

    let pool = backend::bootstrap::pool::init(&std::env::var("DATABASE_URL").unwrap());
    let mut conn = pool.get().unwrap();
    let rows: Vec<(String, Option<String>, Option<String>)> = consent_records::table
        .inner_join(users::table)
        .filter(users::email.eq(&acc.email))
        .select((
            consent_records::purpose,
            consent_records::ip_address,
            consent_records::user_agent,
        ))
        .load(&mut conn)
        .unwrap();
    assert_eq!(rows.len(), 2);
    for (_, ip, ua) in rows {
        assert!(ip.is_some());
        assert_eq!(ua.as_deref(), Some("etsubi-test/1.0"));
    }
}

#[test]
fn forgot_and_reset_password() {
    let server = TestServer::start();
    let client = Client::new();
    let acc = register(&server, &client, "en");
    take_outbox(&acc.email);
    crate::common::set_status_in_db(&acc.email, "active");

    // Email không tồn tại vẫn 202 để không dò được ai đã đăng ký.
    let r = client
        .post(server.url("/api/v1/auth/forgot-password"))
        .json(&json!({ "email": format!("nobody+{}@example.com", Uuid::new_v4()) }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 202);

    let r = client
        .post(server.url("/api/v1/auth/forgot-password"))
        .json(&json!({ "email": acc.email }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 202);
    let mails = take_outbox(&acc.email);
    assert_eq!(mails.len(), 1);
    assert!(mails[0].html.contains("lang=\"en\""));
    let token = token_from(&mails[0], "reset-password");

    // Token đặt lại mật khẩu không dùng để xác nhận email được.
    let r = client
        .post(server.url("/api/v1/auth/verify-email"))
        .json(&json!({ "token": token }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 400);

    let r = client
        .post(server.url("/api/v1/auth/reset-password"))
        .json(&json!({ "token": token, "password": "short" }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 400);
    assert_eq!(r.json::<Value>().unwrap()["code"], "weak_password");

    let r = client
        .post(server.url("/api/v1/auth/reset-password"))
        .json(&json!({ "token": token, "password": "brand-new-pass" }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 204, "reset: {:?}", r.text());

    // Có mail báo đã đổi mật khẩu.
    let mails = take_outbox(&acc.email);
    assert_eq!(mails.len(), 1);
    assert!(mails[0].subject.contains("changed"));

    // Link chỉ dùng được một lần.
    let r = client
        .post(server.url("/api/v1/auth/reset-password"))
        .json(&json!({ "token": token, "password": "another-pass-1" }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 400);
    assert_eq!(r.json::<Value>().unwrap()["code"], "invalid_link");

    assert_eq!(login(&server, &client, &acc.email, &acc.password).status(), 401);
    assert_eq!(login(&server, &client, &acc.email, "brand-new-pass").status(), 200);
}
