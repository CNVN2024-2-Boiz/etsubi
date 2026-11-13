use serde_json::json;

use crate::common::{TestServer, register_and_login, set_role_in_db};

#[test]
fn moderator_cannot_ban_peer() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "moderator");
    set_role_in_db(&target.email, "moderator");

    let r = actor
        .client
        .patch(server.url(&format!("/api/v1/manage/users/{}/status", target.id)))
        .bearer_auth(&actor.token)
        .json(&json!({"status": "banned"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);
}

#[test]
fn moderator_cannot_mute_peer() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "moderator");
    set_role_in_db(&target.email, "moderator");

    let r = actor
        .client
        .patch(server.url(&format!("/api/v1/manage/users/{}/mute", target.id)))
        .bearer_auth(&actor.token)
        .json(&json!({"muted_until": "2030-01-01T00:00:00Z"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);
}

#[test]
fn moderator_cannot_ban_self() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    set_role_in_db(&user.email, "moderator");

    let r = user
        .client
        .patch(server.url(&format!("/api/v1/manage/users/{}/status", user.id)))
        .bearer_auth(&user.token)
        .json(&json!({"status": "banned"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);
}

#[test]
fn moderator_can_hide_peer_post() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "moderator");
    set_role_in_db(&target.email, "moderator");

    let r = target
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&target.token)
        .json(&json!({"title": "T", "content": "C"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201);
    let post_id = r.json::<serde_json::Value>().unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();

    let r = actor
        .client
        .patch(server.url(&format!("/api/v1/manage/posts/{}/status", post_id)))
        .bearer_auth(&actor.token)
        .json(&json!({"status": "hidden"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
}
