use rstest::*;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::common::{TestServer, TestUser, register_and_login, set_role_in_db};

fn create_post(user: &TestUser, server: &TestServer, title: &str) -> String {
    let r = user
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user.token)
        .json(&json!({"title": title, "content": "post body"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201, "create post: {:?}", r.text());
    r.json::<Value>().unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string()
}

fn create_comment(
    user: &TestUser,
    server: &TestServer,
    post_id: &str,
    content: &str,
    parent_id: Option<&str>,
) -> Value {
    let body = match parent_id {
        Some(p) => json!({"content": content, "parent_id": p}),
        None => json!({"content": content}),
    };
    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/comments", post_id)))
        .bearer_auth(&user.token)
        .json(&body)
        .send()
        .unwrap();
    assert_eq!(r.status(), 201, "create comment: {:?}", r.text());
    r.json().unwrap()
}

#[test]
fn full_comment_crud_flow() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server, "T");

    let created = create_comment(&user, &server, &post_id, "hello world", None);
    let comment_id = created["id"].as_str().unwrap().to_string();
    assert_eq!(created["content"], "hello world");
    assert_eq!(created["post_id"], post_id);
    assert_eq!(created["status"], "visible");
    assert_eq!(created["is_deleted"], false);
    assert_eq!(created["parent_id"], Value::Null);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/comments/{}", comment_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts/{}/comments", post_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let list: Vec<Value> = r.json().unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0]["id"], comment_id);

    let r = user
        .client
        .patch(server.url(&format!("/api/v1/comments/{}", comment_id)))
        .bearer_auth(&user.token)
        .json(&json!({"content": "edited"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200, "update: {:?}", r.text());
    assert_eq!(r.json::<Value>().unwrap()["content"], "edited");

    let r = user
        .client
        .delete(server.url(&format!("/api/v1/comments/{}", comment_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/comments/{}", comment_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts/{}/comments", post_id)))
        .send()
        .unwrap();
    let list: Vec<Value> = r.json().unwrap();
    assert!(list.is_empty());
}

#[test]
fn reply_to_comment_sets_parent_id() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server, "T");

    let parent = create_comment(&user, &server, &post_id, "parent", None);
    let parent_id = parent["id"].as_str().unwrap().to_string();

    let child = create_comment(&user, &server, &post_id, "child", Some(&parent_id));
    assert_eq!(child["parent_id"], parent_id);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts/{}/comments", post_id)))
        .send()
        .unwrap();
    let list: Vec<Value> = r.json().unwrap();
    assert_eq!(list.len(), 2);
}

#[test]
fn reply_to_comment_in_other_post_rejected() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_a = create_post(&user, &server, "A");
    let post_b = create_post(&user, &server, "B");

    let parent = create_comment(&user, &server, &post_a, "parent", None);
    let parent_id = parent["id"].as_str().unwrap().to_string();

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/comments", post_b)))
        .bearer_auth(&user.token)
        .json(&json!({"content": "cross", "parent_id": parent_id}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}

#[rstest]
#[case::empty(      "".to_string(),      400)]
#[case::whitespace( "   ".to_string(),   400)]
#[case::too_long(   "a".repeat(10_001),  400)]
fn create_comment_validation(#[case] content: String, #[case] expected: u16) {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server, "T");

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/comments", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"content": content}))
        .send()
        .unwrap();
    assert_eq!(r.status(), expected, "body: {:?}", r.text());
}

#[test]
fn create_comment_requires_auth() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server, "T");

    let r = reqwest::blocking::Client::new()
        .post(server.url(&format!("/api/v1/posts/{}/comments", post_id)))
        .json(&json!({"content": "x"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn create_comment_on_missing_post_returns_404() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/comments", Uuid::new_v4())))
        .bearer_auth(&user.token)
        .json(&json!({"content": "x"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}

#[test]
fn update_and_delete_require_ownership() {
    let server = TestServer::start();
    let user_a = register_and_login(&server.base);
    let user_b = register_and_login(&server.base);
    let post_id = create_post(&user_a, &server, "T");
    let comment = create_comment(&user_a, &server, &post_id, "original", None);
    let comment_id = comment["id"].as_str().unwrap().to_string();

    let r = user_b
        .client
        .patch(server.url(&format!("/api/v1/comments/{}", comment_id)))
        .bearer_auth(&user_b.token)
        .json(&json!({"content": "hacked"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);

    let r = user_b
        .client
        .delete(server.url(&format!("/api/v1/comments/{}", comment_id)))
        .bearer_auth(&user_b.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);

    let r = user_a
        .client
        .get(server.url(&format!("/api/v1/comments/{}", comment_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["content"], "original");
}

#[test]
fn staff_can_moderate_comment_status() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let staff = register_and_login(&server.base);
    let post_id = create_post(&author, &server, "T");
    let comment = create_comment(&author, &server, &post_id, "hello", None);
    let comment_id = comment["id"].as_str().unwrap().to_string();

    let r = staff
        .client
        .patch(server.url(&format!("/api/v1/manage/comments/{}/status", comment_id)))
        .bearer_auth(&staff.token)
        .json(&json!({"status": "hidden"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);

    set_role_in_db(&staff.email, "moderator");

    let r = staff
        .client
        .patch(server.url(&format!("/api/v1/manage/comments/{}/status", comment_id)))
        .bearer_auth(&staff.token)
        .json(&json!({"status": "hidden"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200, "hide: {:?}", r.text());
    assert_eq!(r.json::<Value>().unwrap()["status"], "hidden");

    let r = author
        .client
        .get(server.url(&format!("/api/v1/posts/{}/comments", post_id)))
        .send()
        .unwrap();
    let list: Vec<Value> = r.json().unwrap();
    assert!(list.is_empty());

    let r = staff
        .client
        .patch(server.url(&format!("/api/v1/manage/comments/{}/status", comment_id)))
        .bearer_auth(&staff.token)
        .json(&json!({"status": "visible"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
}

#[test]
fn staff_can_restore_deleted_comment() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let staff = register_and_login(&server.base);
    let post_id = create_post(&author, &server, "T");
    let comment = create_comment(&author, &server, &post_id, "hello", None);
    let comment_id = comment["id"].as_str().unwrap().to_string();

    let r = author
        .client
        .delete(server.url(&format!("/api/v1/comments/{}", comment_id)))
        .bearer_auth(&author.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    set_role_in_db(&staff.email, "moderator");

    let r = staff
        .client
        .post(server.url(&format!("/api/v1/manage/comments/{}/restore", comment_id)))
        .bearer_auth(&staff.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200, "restore: {:?}", r.text());
    assert_eq!(r.json::<Value>().unwrap()["is_deleted"], false);
}

#[test]
fn my_comments_list() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server, "T");
    create_comment(&user, &server, &post_id, "one", None);
    create_comment(&user, &server, &post_id, "two", None);

    let r = user
        .client
        .get(server.url("/api/v1/my/comments"))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let list: Vec<Value> = r.json().unwrap();
    assert_eq!(list.len(), 2);
}

#[test]
fn deleted_comment_hidden_from_my_list() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server, "T");
    let comment = create_comment(&user, &server, &post_id, "bye", None);
    let comment_id = comment["id"].as_str().unwrap().to_string();

    let r = user
        .client
        .delete(server.url(&format!("/api/v1/comments/{}", comment_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .get(server.url("/api/v1/my/comments"))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    let list: Vec<Value> = r.json().unwrap();
    assert!(list.is_empty());
}
