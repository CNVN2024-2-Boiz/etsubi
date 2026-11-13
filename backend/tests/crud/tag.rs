use serde_json::{Value, json};

use crate::common::{TestServer, TestUser, register_and_login};

fn create_post(user: &TestUser, server: &TestServer) -> String {
    let r = user
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user.token)
        .json(&json!({"title": "T", "content": "C"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201);
    r.json::<Value>().unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string()
}

fn first_tag_id(server: &TestServer) -> String {
    let r = reqwest::blocking::Client::new()
        .get(server.url("/api/v1/tags"))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let tags: Vec<Value> = r.json().unwrap();
    assert!(!tags.is_empty(), "seed tags should exist");
    tags[0]["id"].as_str().unwrap().to_string()
}

#[test]
fn list_tags() {
    let server = TestServer::start();
    let r = reqwest::blocking::Client::new()
        .get(server.url("/api/v1/tags"))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let tags: Vec<Value> = r.json().unwrap();
    assert!(tags.len() >= 5);
}

#[test]
fn get_tag_by_id() {
    let server = TestServer::start();
    let tag_id = first_tag_id(&server);

    let r = reqwest::blocking::Client::new()
        .get(server.url(&format!("/api/v1/tags/{}", tag_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["id"], tag_id);
}

#[test]
fn attach_and_detach_tag() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server);
    let tag_id = first_tag_id(&server);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/tags/{}", post_id, tag_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204, "attach: {:?}", r.text());

    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts/{}/tags", post_id)))
        .send()
        .unwrap();
    let tags: Vec<Value> = r.json().unwrap();
    assert_eq!(tags.len(), 1);
    assert_eq!(tags[0]["id"], tag_id);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/tags/{}/posts", tag_id)))
        .send()
        .unwrap();
    let posts: Vec<Value> = r.json().unwrap();
    assert_eq!(posts.len(), 1);
    assert_eq!(posts[0]["id"], post_id);

    let r = user
        .client
        .delete(server.url(&format!("/api/v1/posts/{}/tags/{}", post_id, tag_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts/{}/tags", post_id)))
        .send()
        .unwrap();
    let tags: Vec<Value> = r.json().unwrap();
    assert!(tags.is_empty());
}

#[test]
fn double_attach_conflicts() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server);
    let tag_id = first_tag_id(&server);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/tags/{}", post_id, tag_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/tags/{}", post_id, tag_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 409);
}

#[test]
fn detach_missing_returns_409() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server);
    let tag_id = first_tag_id(&server);

    let r = user
        .client
        .delete(server.url(&format!("/api/v1/posts/{}/tags/{}", post_id, tag_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 409);
}

#[test]
fn attach_requires_ownership() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);
    let post_id = create_post(&alice, &server);
    let tag_id = first_tag_id(&server);

    let r = bob
        .client
        .post(server.url(&format!("/api/v1/posts/{}/tags/{}", post_id, tag_id)))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);
}

#[test]
fn attach_missing_tag_returns_404() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server);

    let r = user
        .client
        .post(server.url(&format!(
            "/api/v1/posts/{}/tags/{}",
            post_id,
            uuid::Uuid::new_v4()
        )))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}
