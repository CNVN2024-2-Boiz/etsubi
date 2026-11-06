use serde_json::json;

use crate::common::{TestServer, register_and_login, set_role_in_db};

#[test]
fn user_cannot_ban_moderator() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
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
fn user_cannot_change_moderator_role() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&target.email, "moderator");

    let r = actor
        .client
        .patch(server.url(&format!("/api/v1/manage/users/{}/role", target.id)))
        .bearer_auth(&actor.token)
        .json(&json!({"role": "user"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);
}

#[test]
fn user_cannot_mute_moderator() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
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
fn moderator_can_modify_user() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "moderator");

    let r = actor
        .client
        .patch(server.url(&format!("/api/v1/manage/users/{}/status", target.id)))
        .bearer_auth(&actor.token)
        .json(&json!({"status": "banned"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
}

#[test]
fn moderator_cannot_change_roles() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "moderator");

    let r = actor
        .client
        .patch(server.url(&format!("/api/v1/manage/users/{}/role", target.id)))
        .bearer_auth(&actor.token)
        .json(&json!({"role": "moderator"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);
}
