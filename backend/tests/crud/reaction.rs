use rstest::*;
use serde_json::{Value, json};
use uuid::Uuid;

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

#[test]
fn upsert_and_summary() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);
    let post_id = create_post(&alice, &server);

    let r = alice
        .client
        .post(server.url(&format!("/api/v1/posts/{}/reactions", post_id)))
        .bearer_auth(&alice.token)
        .json(&json!({"emoji": "❤️"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);

    let r = bob
        .client
        .post(server.url(&format!("/api/v1/posts/{}/reactions", post_id)))
        .bearer_auth(&bob.token)
        .json(&json!({"emoji": "❤️"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);

    let r = alice
        .client
        .get(server.url(&format!("/api/v1/posts/{}/reactions/summary", post_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let summary: Vec<Value> = r.json().unwrap();
    assert_eq!(summary.len(), 1);
    assert_eq!(summary[0]["emoji"], "❤️");
    assert_eq!(summary[0]["count"], 2);
}

#[test]
fn change_reaction_emoji() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/reactions", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"emoji": "❤️"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/reactions", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"emoji": "👍"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["emoji"], "👍");

    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts/{}/reactions/me", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["emoji"], "👍");
}

#[test]
fn remove_reaction() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/reactions", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"emoji": "❤️"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);

    let r = user
        .client
        .delete(server.url(&format!("/api/v1/posts/{}/reactions", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = user
        .client
        .get(server.url(&format!("/api/v1/posts/{}/reactions/me", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}

#[test]
fn remove_missing_reaction_returns_404() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server);

    let r = user
        .client
        .delete(server.url(&format!("/api/v1/posts/{}/reactions", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}

#[rstest]
#[case::empty(      "".to_string(),      400)]
#[case::whitespace( "   ".to_string(),   400)]
#[case::too_long(   "x".repeat(33),      400)]
fn emoji_validation(#[case] emoji: String, #[case] expected: u16) {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/reactions", post_id)))
        .bearer_auth(&user.token)
        .json(&json!({"emoji": emoji}))
        .send()
        .unwrap();
    assert_eq!(r.status(), expected, "body: {:?}", r.text());
}

#[test]
fn react_missing_post_returns_404() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);

    let r = user
        .client
        .post(server.url(&format!("/api/v1/posts/{}/reactions", Uuid::new_v4())))
        .bearer_auth(&user.token)
        .json(&json!({"emoji": "❤️"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}

#[test]
fn react_requires_auth() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    let post_id = create_post(&user, &server);

    let r = reqwest::blocking::Client::new()
        .post(server.url(&format!("/api/v1/posts/{}/reactions", post_id)))
        .json(&json!({"emoji": "❤️"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn list_reactions_on_post() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);
    let post_id = create_post(&alice, &server);

    for (user, emoji) in [(&alice, "❤️"), (&bob, "👍")] {
        let r = user
            .client
            .post(server.url(&format!("/api/v1/posts/{}/reactions", post_id)))
            .bearer_auth(&user.token)
            .json(&json!({"emoji": emoji}))
            .send()
            .unwrap();
        assert_eq!(r.status(), 200);
    }

    let r = alice
        .client
        .get(server.url(&format!("/api/v1/posts/{}/reactions", post_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let list: Vec<Value> = r.json().unwrap();
    assert_eq!(list.len(), 2);
}
