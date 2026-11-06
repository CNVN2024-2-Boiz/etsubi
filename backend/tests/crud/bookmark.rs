use serde_json::{Value, json};
use uuid::Uuid;

use crate::common::{TestServer, TestUser, register_and_login};

fn create_post(user: &TestUser, server: &TestServer, title: &str) -> String {
    let r = user
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user.token)
        .json(&json!({"title": title, "content": "body"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201);
    r.json::<Value>().unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn add_list_check_remove() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server, "T");

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/bookmark", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .get(server.url("/api/v1/my/bookmarks"))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let list: Vec<Value> = r.json().unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0]["id"], post_id);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/my/bookmarks/{}", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["bookmarked"], true);

    let r = user
        .client
        .delete(server.url(&format!("/api/v1/posts/{}/bookmark", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/my/bookmarks/{}", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["bookmarked"], false);
}

#[test]
fn double_bookmark_conflicts() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server, "T");

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/bookmark", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/bookmark", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 409);
}

#[test]
fn remove_unbookmarked_returns_404() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server, "T");

    let r = user
        .client
        .delete(server.url(&format!("/api/v1/posts/{}/bookmark", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}

#[test]
fn bookmark_missing_post_returns_404() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/bookmark", Uuid::new_v4())))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}

#[test]
fn bookmark_requires_auth() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server, "T");

    let r = reqwest::blocking::Client::new()
        .post(server.url(&format!("/api/v1/posts/{}/bookmark", post_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn bookmark_deleted_post_hidden_from_list() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server, "T");

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/bookmark", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .delete(server.url(&format!("/api/v1/posts/{}", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .get(server.url("/api/v1/my/bookmarks"))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    let list: Vec<Value> = r.json().unwrap();
    assert!(list.is_empty());
}
