use rstest::*;
use serde_json::{Value, json};

use crate::common::{TestServer, TestUser, register_and_login, set_role_in_db};

fn tag_at(server: &TestServer, i: usize) -> String {
    let tags: Vec<Value> = reqwest::blocking::Client::new()
        .get(server.url("/api/v1/tags"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    tags[i]["id"].as_str().unwrap().to_string()
}

fn post_with_tags(user: &TestUser, server: &TestServer, title: &str, tag_ids: &[&str]) -> String {
    let r = user
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user.token)
        .json(&json!({"title": title, "content": "body"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201);
    let id = r.json::<Value>().unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();
    for t in tag_ids {
        let r = user
            .client
            .post(server.url(&format!("/api/v1/posts/{}/tags/{}", id, t)))
            .bearer_auth(&user.token)
            .send()
            .unwrap();
        assert_eq!(r.status(), 204);
    }
    id
}

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

#[test]
fn search_no_filter_returns_published() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    post_with_tags(&user, &server, "a", &[]);
    post_with_tags(&user, &server, "b", &[]);
    let r = user.client.get(server.url("/api/v1/posts")).send().unwrap();
    assert_eq!(r.status(), 200);
    assert!(r.json::<Vec<Value>>().unwrap().len() >= 2);
}

#[test]
fn search_by_query() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let a = post_with_tags(&user, &server, "Rust ownership", &[]);
    post_with_tags(&user, &server, "Python basics", &[]);
    let list: Vec<Value> = user
        .client
        .get(server.url("/api/v1/posts?q=rust"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert!(list.iter().any(|p| p["id"] == a));
    assert!(!list.iter().any(|p| p["title"] == "Python basics"));
}

#[test]
fn search_by_tag() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let t = tag_at(&server, 0);
    let a = post_with_tags(&user, &server, "A", &[&t]);
    post_with_tags(&user, &server, "B", &[]);
    let list: Vec<Value> = user
        .client
        .get(server.url(&format!("/api/v1/posts?tags={}", t)))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert!(list.iter().any(|p| p["id"] == a));
}

#[test]
fn search_multiple_tags_requires_all() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let t0 = tag_at(&server, 0);
    let t1 = tag_at(&server, 1);
    let only0 = post_with_tags(&user, &server, "only0", &[&t0]);
    let both = post_with_tags(&user, &server, "both", &[&t0, &t1]);
    let list: Vec<Value> = user
        .client
        .get(server.url(&format!("/api/v1/posts?tags={},{}", t0, t1)))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert!(list.iter().any(|p| p["id"] == both));
    assert!(!list.iter().any(|p| p["id"] == only0));
}

#[test]
fn search_query_and_tag() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let t = tag_at(&server, 0);
    let untagged = post_with_tags(&user, &server, "Rust", &[]);
    let hit = post_with_tags(&user, &server, "Rust", &[&t]);
    let list: Vec<Value> = user
        .client
        .get(server.url(&format!("/api/v1/posts?q=Rust&tags={}", t)))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert!(list.iter().any(|p| p["id"] == hit));
    assert!(!list.iter().any(|p| p["id"] == untagged));
}

#[test]
fn search_excludes_hidden_and_deleted() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let live = post_with_tags(&user, &server, "keepme", &[]);
    let hidden = post_with_tags(&user, &server, "keepme", &[]);
    let deleted = post_with_tags(&user, &server, "keepme", &[]);

    set_role_in_db(&user.email, "admin");
    let r = user
        .client
        .patch(server.url(&format!("/api/v1/manage/posts/{}/status", hidden)))
        .bearer_auth(&user.token)
        .json(&json!({"status": "hidden"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);

    let r = user
        .client
        .delete(server.url(&format!("/api/v1/posts/{}", deleted)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let list: Vec<Value> = user
        .client
        .get(server.url("/api/v1/posts?q=keepme"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert!(list.iter().any(|p| p["id"] == live));
    assert!(!list.iter().any(|p| p["id"] == hidden));
    assert!(!list.iter().any(|p| p["id"] == deleted));
}

#[test]
fn search_invalid_tag_uuid_returns_400() {
    let server = TestServer::start();
    let r = reqwest::blocking::Client::new()
        .get(server.url("/api/v1/posts?tags=not-a-uuid"))
        .send()
        .unwrap();
    assert_eq!(r.status(), 400);
}

#[test]
fn search_unknown_tag_returns_empty() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    post_with_tags(&user, &server, "Rust", &[]);
    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts?tags={}", uuid::Uuid::new_v4())))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert!(r.json::<Vec<Value>>().unwrap().is_empty());
}
