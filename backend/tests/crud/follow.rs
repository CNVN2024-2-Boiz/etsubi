use serde_json::Value;

use crate::common::{TestServer, register_and_login};

#[test]
fn follow_and_list() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let r = alice
        .client
        .post(server.url(&format!("/api/v1/users/{}/follow", bob.id)))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = alice
        .client
        .get(server.url("/api/v1/my/following"))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let list: Vec<Value> = r.json().unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0]["id"], bob.id.to_string());

    let r = bob
        .client
        .get(server.url("/api/v1/my/followers"))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    let list: Vec<Value> = r.json().unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0]["id"], alice.id.to_string());

    let r = alice
        .client
        .get(server.url(&format!("/api/v1/users/{}/followers", bob.id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let list: Vec<Value> = r.json().unwrap();
    assert_eq!(list.len(), 1);

    let r = alice
        .client
        .get(server.url(&format!("/api/v1/my/following/{}", bob.id)))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["following"], true);

    let r = bob
        .client
        .get(server.url(&format!("/api/v1/my/followers/{}", alice.id)))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["followed_by"], true);
}

#[test]
fn unfollow_removes_relationship() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let r = alice
        .client
        .post(server.url(&format!("/api/v1/users/{}/follow", bob.id)))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = alice
        .client
        .delete(server.url(&format!("/api/v1/users/{}/follow", bob.id)))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = alice
        .client
        .get(server.url("/api/v1/my/following"))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    let list: Vec<Value> = r.json().unwrap();
    assert!(list.is_empty());
}

#[test]
fn cannot_follow_self() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);

    let r = alice
        .client
        .post(server.url(&format!("/api/v1/users/{}/follow", alice.id)))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 400);
}

#[test]
fn double_follow_conflicts() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let r = alice
        .client
        .post(server.url(&format!("/api/v1/users/{}/follow", bob.id)))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = alice
        .client
        .post(server.url(&format!("/api/v1/users/{}/follow", bob.id)))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 409);
}

#[test]
fn follow_missing_user_returns_404() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);

    let r = alice
        .client
        .post(server.url(&format!("/api/v1/users/{}/follow", uuid::Uuid::new_v4())))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}

#[test]
fn follow_requires_auth() {
    let server = TestServer::start();
    let bob = register_and_login(&server.base);

    let r = reqwest::blocking::Client::new()
        .post(server.url(&format!("/api/v1/users/{}/follow", bob.id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}
