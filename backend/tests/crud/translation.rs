use serde_json::{Value, json};

use crate::common::{TestServer, TestUser, register_and_login};

fn create_post(user: &TestUser, server: &TestServer) -> String {
    let r = user
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user.token)
        .json(&json!({"title": "Hello", "content": "world"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201);
    r.json::<Value>().unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn translate_post_requires_auth() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server);

    let r = reqwest::blocking::Client::new()
        .post(server.url(&format!("/api/v1/posts/{}/translate", post_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn translate_post_missing_returns_404() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/translate", uuid::Uuid::new_v4())))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}

#[test]
fn translate_post_without_provider_returns_503() {
    if std::env::var("TRANSLATION_API_KEY")
        .map(|v| !v.is_empty())
        .unwrap_or(false)
    {
        eprintln!("skipping: TRANSLATION_API_KEY is set");
        return;
    }

    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/translate", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 503);
}
