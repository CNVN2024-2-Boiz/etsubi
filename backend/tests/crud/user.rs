use rstest::*;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::common::{TestServer, register_and_login};

#[test]
fn full_auth_flow() {
    let server = TestServer::start();
    let client = reqwest::blocking::Client::new();
    let uid = Uuid::new_v4();
    let username = format!("test_{}", uid);
    let email = format!("test+{}@example.com", uid);
    let password = "password123";

    let r = client
        .post(server.url("/api/v1/auth/register"))
        .json(&json!({
            "username": username,
            "email": email,
            "password": password,
            "language": "en",
        }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201, "register: {:?}", r.text());

    let r = client
        .post(server.url("/api/v1/auth/login"))
        .json(&json!({ "email": email, "password": password }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let login: Value = r.json().unwrap();
    let token = login["token"].as_str().unwrap().to_string();

    let r = client
        .get(server.url("/api/v1/my"))
        .bearer_auth(&token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let me: Value = r.json().unwrap();
    assert_eq!(me["email"], email);
    assert_eq!(me["username"], username);
    assert_eq!(me["role"], "user");

    let r = client
        .post(server.url("/api/v1/auth/logout"))
        .bearer_auth(&token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = client
        .get(server.url("/api/v1/my"))
        .bearer_auth(&token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);

    crate::common::cleanup_user(&email);
}

#[rstest]
#[case::weak_password("test_user", "x.com", "short", "vi", "en", 400)]
#[case::bad_language("test_user", "x.com", "password123", "vi", "xx", 400)]
#[case::bad_native("test_user", "x.com", "password123", "xx", "en", 400)]
#[case::short_username("ab", "x.com", "password123", "vi", "en", 400)]
fn register_rejects_invalid_input(
    #[case] username: &str,
    #[case] domain: &str,
    #[case] password: &str,
    #[case] native: &str,
    #[case] language: &str,
    #[case] expected: u16,
) {
    let server = TestServer::start();
    let client = reqwest::blocking::Client::new();
    let uid = Uuid::new_v4();
    let email = format!("test+{}@{}", uid, domain);

    let r = client
        .post(server.url("/api/v1/auth/register"))
        .json(&json!({
            "username": username,
            "email": email,
            "password": password,
            "native": native,
            "language": language,
        }))
        .send()
        .unwrap();
    assert_eq!(r.status(), expected, "body: {:?}", r.text());
    crate::common::cleanup_user(&email);
}

#[rstest]
#[case::wrong_password("wrong_pass", 401)]
#[case::no_such_user("whatever", 401)]
fn login_rejects_invalid_credentials(#[case] password: &str, #[case] expected: u16) {
    let server = TestServer::start();
    let client = reqwest::blocking::Client::new();
    let uid = Uuid::new_v4();
    let email = format!("test+{}@example.com", uid);

    let r = client
        .post(server.url("/api/v1/auth/login"))
        .json(&json!({ "email": email, "password": password }))
        .send()
        .unwrap();
    assert_eq!(r.status(), expected);
}

#[test]
fn get_user_public() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/users/{}", user.id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let body: Value = r.json().unwrap();
    assert_eq!(body["id"], user.id.to_string());
    assert_eq!(body["email"], user.email);
}

#[test]
fn update_my_profile() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);

    let r = user
        .client
        .patch(server.url("/api/v1/my"))
        .bearer_auth(&user.token)
        .json(&json!({"bio": "hello world", "institure": "UIT"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200, "update: {:?}", r.text());
    let body: Value = r.json().unwrap();
    assert_eq!(body["bio"], "hello world");
    assert_eq!(body["institure"], "UIT");
}

#[test]
fn change_password_invalidates_token() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);

    let r = user
        .client
        .patch(server.url("/api/v1/my/password"))
        .bearer_auth(&user.token)
        .json(&json!({
            "current_password": "password123",
            "new_password": "newpassword456",
        }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .get(server.url("/api/v1/my"))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 401, "old token should be invalidated");

    let r = user
        .client
        .post(server.url("/api/v1/auth/login"))
        .json(&json!({ "email": user.email, "password": "newpassword456" }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
}
