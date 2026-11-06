use serde_json::{Value, json};

use crate::common::{TestServer, TestUser, register_and_login, set_role_in_db};

fn promote(user: &TestUser, role: &str) {
    set_role_in_db(&user.email, role);
}

#[test]
fn user_cannot_ban_admin() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    promote(&target, "admin");

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
fn user_cannot_change_admin_role() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    promote(&target, "admin");

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
fn user_cannot_mute_admin() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    promote(&target, "admin");

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
fn user_cannot_self_ban() {
    let server = TestServer::start();
    let user = register_and_login(&server.base);
    promote(&user, "admin");

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
fn admin_can_modify_user() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    promote(&actor, "admin");

    let r = actor
        .client
        .patch(server.url(&format!("/api/v1/manage/users/{}/status", target.id)))
        .bearer_auth(&actor.token)
        .json(&json!({"status": "banned"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200, "ban user: {:?}", r.text());
    assert_eq!(r.json::<Value>().unwrap()["status"], "banned");
}

#[test]
fn admin_can_promote_user_to_moderator() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    promote(&actor, "admin");

    let r = actor
        .client
        .patch(server.url(&format!("/api/v1/manage/users/{}/role", target.id)))
        .bearer_auth(&actor.token)
        .json(&json!({"role": "moderator"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["role"], "moderator");
}

#[test]
fn admin_cannot_assign_admin_role() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    promote(&actor, "admin");

    let r = actor
        .client
        .patch(server.url(&format!("/api/v1/manage/users/{}/role", target.id)))
        .bearer_auth(&actor.token)
        .json(&json!({"role": "admin"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);
}

#[test]
fn admin_cannot_modify_other_admin() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    promote(&actor, "admin");
    promote(&target, "admin");

    let r = actor
        .client
        .patch(server.url(&format!("/api/v1/manage/users/{}/status", target.id)))
        .bearer_auth(&actor.token)
        .json(&json!({"status": "banned"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 403);
}
