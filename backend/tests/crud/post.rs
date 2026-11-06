use rstest::*;
use serde_json::{Value, json};

use crate::common::{TestServer, register_and_login, set_role_in_db};

#[test]
fn full_post_crud_flow() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);

    let r = user
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user.token)
        .json(&json!({"title": "Hello world", "content": "This is my first post."}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201, "create: {:?}", r.text());
    let created: Value = r.json().unwrap();
    let post_id = created["id"].as_str().unwrap().to_string();
    assert_eq!(created["title"], "Hello world");
    assert_eq!(created["status"], "published");
    assert_eq!(created["author_id"], user.id.to_string());

    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts/{}", post_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/users/{}/posts", user.id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let list: Vec<Value> = r.json().unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0]["id"], post_id);

    let r = user
        .client
        .patch(server.url(&format!("/api/v1/posts/{}", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"title": "Hello again", "content": "Updated content."}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200, "update: {:?}", r.text());
    assert_eq!(r.json::<Value>().unwrap()["title"], "Hello again");

    let r = user
        .client
        .delete(server.url(&format!("/api/v1/posts/{}", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts/{}", post_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/users/{}/posts", user.id)))
        .send()
        .unwrap();
    let list: Vec<Value> = r.json().unwrap();
    assert!(list.is_empty());
}

#[rstest]
#[case::empty_title(      "".to_string(),      "content".to_string(),    400)]
#[case::whitespace_title( "   ".to_string(),   "content".to_string(),    400)]
#[case::too_long_title(   "a".repeat(256),     "content".to_string(),    400)]
#[case::too_long_content( "title".to_string(), "a".repeat(100_001),      400)]
fn create_post_validation(#[case] title: String, #[case] content: String, #[case] expected: u16) {
    let server = TestServer::start();
    let user = register_and_login(&server.base);

    let r = user
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user.token)
        .json(&json!({ "title": title, "content": content }))
        .send()
        .unwrap();
    assert_eq!(r.status(), expected, "body: {:?}", r.text());
}

#[test]
fn create_post_requires_auth() {
    let server = TestServer::start();
    let r = reqwest::blocking::Client::new()
        .post(server.url("/api/v1/posts"))
        .json(&json!({ "title": "T", "content": "C" }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn update_and_delete_require_ownership() {
    let server = TestServer::start();
    let user_a = register_and_login(&server.base);
    let user_b = register_and_login(&server.base);

    let r = user_a
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user_a.token)
        .json(&json!({"title": "T", "content": "C"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201);
    let post_id = r.json::<Value>().unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();

    let r = user_b
        .client
        .patch(server.url(&format!("/api/v1/posts/{}", post_id)))
        .bearer_auth(&user_b.token)
        .json(&json!({"title": "Hacked", "content": "Content"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);

    let r = user_b
        .client
        .delete(server.url(&format!("/api/v1/posts/{}", post_id)))
        .bearer_auth(&user_b.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);

    let r = user_a
        .client
        .get(server.url(&format!("/api/v1/posts/{}", post_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
}

#[test]
fn staff_can_hide_and_restore_post() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);

    let r = user
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user.token)
        .json(&json!({"title": "T", "content": "C"}))
        .send()
        .unwrap();
    let post_id = r.json::<Value>().unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();

    let r = user
        .client
        .patch(server.url(&format!("/api/v1/manage/posts/{}/status", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"status": "hidden"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);

    set_role_in_db(&user.email, "admin");

    let r = user
        .client
        .patch(server.url(&format!("/api/v1/manage/posts/{}/status", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"status": "hidden"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200, "hide: {:?}", r.text());
    assert_eq!(r.json::<Value>().unwrap()["status"], "hidden");

    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts/{}", post_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/users/{}/posts", user.id)))
        .send()
        .unwrap();
    let list: Vec<Value> = r.json().unwrap();
    assert!(list.is_empty());

    let r = user
        .client
        .patch(server.url(&format!("/api/v1/manage/posts/{}/status", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"status": "published"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts/{}", post_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
}

#[test]
fn lock_comments_blocks_new_comments() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);

    let r = user
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user.token)
        .json(&json!({"title": "T", "content": "C"}))
        .send()
        .unwrap();
    let post_id = r.json::<Value>().unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();

    let r = user
        .client
        .patch(server.url(&format!("/api/v1/posts/{}/comments/lock", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"locked": true}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["comments_locked"], true);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/comments", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"content": "Hello"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);

    let r = user
        .client
        .patch(server.url(&format!("/api/v1/posts/{}/comments/lock", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"locked": false}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/comments", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"content": "Hello"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201);
}
