use rstest::*;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::common::{TestServer, TestUser, register_and_login, set_role_in_db};

fn post_notification(
    user: &TestUser,
    server: &TestServer,
    body: Value,
) -> reqwest::blocking::Response {
    user.client
        .post(server.url("/api/v1/notifications"))
        .bearer_auth(&user.token)
        .json(&body)
        .send()
        .unwrap()
}

fn create_notification(user: &TestUser, server: &TestServer, body: Value) -> Value {
    let r = post_notification(user, server, body);
    assert_eq!(
        r.status(),
        201,
        "create notification failed: {:?}",
        r.text()
    );
    r.json().unwrap()
}

fn list_notifications(user: &TestUser, server: &TestServer) -> Vec<Value> {
    let r = user
        .client
        .get(server.url("/api/v1/my/notifications"))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    r.json().unwrap()
}

fn unread_count(user: &TestUser, server: &TestServer) -> i64 {
    let r = user
        .client
        .get(server.url("/api/v1/my/notifications/unread-count"))
        .bearer_auth(&user.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    r.json::<Value>().unwrap()["count"].as_i64().unwrap()
}

#[test]
fn create_follow_notification() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let n = create_notification(
        &alice,
        &server,
        json!({
            "kind": "follow",
            "target_user_id": bob.id,
            "link": format!("/users/{}", alice.id),
        }),
    );

    assert_eq!(n["kind"], "follow");
    assert_eq!(n["link"], format!("/users/{}", alice.id));
    assert_eq!(n["is_readed"], false);
    assert!(n["message"].as_str().unwrap().contains("started following"));

    let list = list_notifications(&bob, &server);
    assert_eq!(list.len(), 1);
    assert_eq!(list[0]["id"], n["id"]);

    let list_alice = list_notifications(&alice, &server);
    assert!(list_alice.is_empty());
}

#[test]
fn follow_cannot_notify_self() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);

    let r = post_notification(
        &alice,
        &server,
        json!({
            "kind": "follow",
            "target_user_id": alice.id,
            "link": "/users/x",
        }),
    );
    assert_eq!(r.status(), 400);
}

#[test]
fn follow_target_user_not_found() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);

    let r = post_notification(
        &alice,
        &server,
        json!({
            "kind": "follow",
            "target_user_id": Uuid::new_v4(),
            "link": "/users/x",
        }),
    );
    assert_eq!(r.status(), 404);
}

#[test]
fn create_reaction_notification() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let n = create_notification(
        &alice,
        &server,
        json!({
            "kind": "reaction",
            "target_user_id": bob.id,
            "link": "/posts/abc",
            "context": { "emoji": "❤️" },
        }),
    );

    assert_eq!(n["kind"], "reaction");
    assert!(n["message"].as_str().unwrap().contains("❤️"));
    assert!(n["message"].as_str().unwrap().contains("reacted"));
}

#[test]
fn reaction_without_context_returns_400() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let r = post_notification(
        &alice,
        &server,
        json!({
            "kind": "reaction",
            "target_user_id": bob.id,
            "link": "/posts/x",
        }),
    );
    assert_eq!(r.status(), 400);
}

#[test]
fn reaction_context_missing_emoji_returns_400() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let r = post_notification(
        &alice,
        &server,
        json!({
            "kind": "reaction",
            "target_user_id": bob.id,
            "link": "/posts/x",
            "context": {},
        }),
    );
    assert_eq!(r.status(), 400);
}

#[test]
fn reaction_cannot_notify_self() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);

    let r = post_notification(
        &alice,
        &server,
        json!({
            "kind": "reaction",
            "target_user_id": alice.id,
            "link": "/posts/x",
            "context": { "emoji": "❤️" },
        }),
    );
    assert_eq!(r.status(), 400);
}

#[test]
fn create_comment_notification() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let n = create_notification(
        &alice,
        &server,
        json!({
            "kind": "comment",
            "target_user_id": bob.id,
            "link": "/posts/abc?comment=xyz",
        }),
    );

    assert_eq!(n["kind"], "comment");
    assert!(
        n["message"]
            .as_str()
            .unwrap()
            .contains("commented on your post")
    );
}

#[test]
fn comment_cannot_notify_self() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);

    let r = post_notification(
        &alice,
        &server,
        json!({
            "kind": "comment",
            "target_user_id": alice.id,
            "link": "/posts/x",
        }),
    );
    assert_eq!(r.status(), 400);
}

#[test]
fn create_reply_notification() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let n = create_notification(
        &alice,
        &server,
        json!({
            "kind": "reply",
            "target_user_id": bob.id,
            "link": "/posts/abc?comment=xyz",
        }),
    );

    assert_eq!(n["kind"], "reply");
    assert!(
        n["message"]
            .as_str()
            .unwrap()
            .contains("replied to your comment")
    );
}

#[test]
fn reply_cannot_notify_self() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);

    let r = post_notification(
        &alice,
        &server,
        json!({
            "kind": "reply",
            "target_user_id": alice.id,
            "link": "/posts/x",
        }),
    );
    assert_eq!(r.status(), 400);
}

#[test]
fn muted_requires_staff() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);

    let r = post_notification(
        &actor,
        &server,
        json!({
            "kind": "muted",
            "target_user_id": target.id,
            "link": "/my",
            "context": { "muted_until": "2030-01-01T00:00:00Z" },
        }),
    );
    assert_eq!(r.status(), 403);
}

#[test]
fn muted_by_moderator_ok() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "moderator");

    let n = create_notification(
        &actor,
        &server,
        json!({
            "kind": "muted",
            "target_user_id": target.id,
            "link": "/my",
            "context": { "muted_until": "2030-01-01T00:00:00Z" },
        }),
    );

    assert_eq!(n["kind"], "muted");
    assert!(n["message"].as_str().unwrap().contains("muted"));
}

#[test]
fn muted_by_admin_ok() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "admin");

    let n = create_notification(
        &actor,
        &server,
        json!({
            "kind": "muted",
            "target_user_id": target.id,
            "link": "/my",
            "context": { "muted_until": "2030-01-01T00:00:00Z" },
        }),
    );
    assert_eq!(n["kind"], "muted");
}

#[test]
fn muted_without_until_returns_400() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "moderator");

    let r = post_notification(
        &actor,
        &server,
        json!({
            "kind": "muted",
            "target_user_id": target.id,
            "link": "/my",
            "context": {},
        }),
    );
    assert_eq!(r.status(), 400);
}

#[test]
fn banned_requires_staff() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);

    let r = post_notification(
        &actor,
        &server,
        json!({
            "kind": "banned",
            "target_user_id": target.id,
            "link": "/my",
        }),
    );
    assert_eq!(r.status(), 403);
}

#[test]
fn banned_by_moderator_ok() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "moderator");

    let n = create_notification(
        &actor,
        &server,
        json!({
            "kind": "banned",
            "target_user_id": target.id,
            "link": "/my",
        }),
    );

    assert_eq!(n["kind"], "banned");
    assert!(n["message"].as_str().unwrap().contains("banned"));
}

#[test]
fn post_locked_requires_staff() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);

    let r = post_notification(
        &actor,
        &server,
        json!({
            "kind": "post_locked",
            "target_user_id": target.id,
            "link": "/posts/x",
        }),
    );
    assert_eq!(r.status(), 403);
}

#[test]
fn post_locked_by_moderator_ok() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "moderator");

    let n = create_notification(
        &actor,
        &server,
        json!({
            "kind": "post_locked",
            "target_user_id": target.id,
            "link": "/posts/x",
        }),
    );

    assert_eq!(n["kind"], "post_locked");
    assert!(n["message"].as_str().unwrap().contains("locked"));
}

#[test]
fn post_removed_requires_staff() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);

    let r = post_notification(
        &actor,
        &server,
        json!({
            "kind": "post_removed",
            "target_user_id": target.id,
            "link": "/posts/x",
            "context": { "post_title": "Test" },
        }),
    );
    assert_eq!(r.status(), 403);
}

#[test]
fn post_removed_by_moderator_with_title_ok() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "moderator");

    let n = create_notification(
        &actor,
        &server,
        json!({
            "kind": "post_removed",
            "target_user_id": target.id,
            "link": "/posts/x",
            "context": { "post_title": "My post" },
        }),
    );

    assert_eq!(n["kind"], "post_removed");
    assert!(n["message"].as_str().unwrap().contains("My post"));
    assert!(n["message"].as_str().unwrap().contains("has been removed"));
}

#[test]
fn post_removed_by_moderator_without_title_uses_default() {
    let server = TestServer::start();
    let actor = register_and_login(&server.base);
    let target = register_and_login(&server.base);
    set_role_in_db(&actor.email, "moderator");

    let n = create_notification(
        &actor,
        &server,
        json!({
            "kind": "post_removed",
            "target_user_id": target.id,
            "link": "/posts/x",
        }),
    );

    assert_eq!(n["kind"], "post_removed");
    assert!(n["message"].as_str().unwrap().contains("your post"));
}

#[test]
fn invalid_kind_returns_400() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let r = post_notification(
        &alice,
        &server,
        json!({
            "kind": "not_a_real_kind",
            "target_user_id": bob.id,
            "link": "/x",
        }),
    );
    assert_eq!(r.status(), 400);
}

#[test]
fn post_created_kind_rejected_on_create_endpoint() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let r = post_notification(
        &alice,
        &server,
        json!({
            "kind": "post_created",
            "target_user_id": bob.id,
            "link": "/posts/x",
        }),
    );
    assert_eq!(r.status(), 400);
}

#[rstest]
#[case::no_leading_slash("users/abc")]
#[case::empty("")]
#[case::too_long(&format!("/{}", "a".repeat(600)))]
fn invalid_link_returns_400(#[case] link: &str) {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let r = post_notification(
        &alice,
        &server,
        json!({
            "kind": "follow",
            "target_user_id": bob.id,
            "link": link,
        }),
    );
    assert_eq!(r.status(), 400, "link: {:?}", link);
}

#[test]
fn create_requires_auth() {
    let server = TestServer::start();
    let bob = register_and_login(&server.base);

    let r = reqwest::blocking::Client::new()
        .post(server.url("/api/v1/notifications"))
        .json(&json!({
            "kind": "follow",
            "target_user_id": bob.id,
            "link": "/users/x",
        }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn non_post_created_kinds_not_deduped() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let body = json!({
        "kind": "follow",
        "target_user_id": bob.id,
        "link": format!("/users/{}", alice.id),
    });

    create_notification(&alice, &server, body.clone());
    create_notification(&alice, &server, body.clone());
    create_notification(&alice, &server, body);

    let list = list_notifications(&bob, &server);
    assert_eq!(list.len(), 3);
}

#[test]
fn list_empty_when_no_notifications() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);

    let list = list_notifications(&alice, &server);
    assert!(list.is_empty());
}

#[test]
fn list_only_shows_own_notifications() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    create_notification(
        &alice,
        &server,
        json!({
            "kind": "follow",
            "target_user_id": bob.id,
            "link": format!("/users/{}", alice.id),
        }),
    );

    assert_eq!(list_notifications(&bob, &server).len(), 1);
    assert!(list_notifications(&alice, &server).is_empty());
}

#[test]
fn list_respects_limit() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    for _ in 0..3 {
        create_notification(
            &alice,
            &server,
            json!({
                "kind": "follow",
                "target_user_id": bob.id,
                "link": format!("/users/{}", alice.id),
            }),
        );
    }

    let r = bob
        .client
        .get(server.url("/api/v1/my/notifications?limit=2"))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let list: Vec<Value> = r.json().unwrap();
    assert_eq!(list.len(), 2);
}

#[test]
fn list_respects_offset() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    for _ in 0..3 {
        create_notification(
            &alice,
            &server,
            json!({
                "kind": "follow",
                "target_user_id": bob.id,
                "link": format!("/users/{}", alice.id),
            }),
        );
    }

    let r = bob
        .client
        .get(server.url("/api/v1/my/notifications?limit=10&offset=1"))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    let list: Vec<Value> = r.json().unwrap();
    assert_eq!(list.len(), 2);
}

#[test]
fn list_requires_auth() {
    let server = TestServer::start();

    let r = reqwest::blocking::Client::new()
        .get(server.url("/api/v1/my/notifications"))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn unread_count_zero_when_empty() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    assert_eq!(unread_count(&alice, &server), 0);
}

#[test]
fn unread_count_after_creates() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    for _ in 0..3 {
        create_notification(
            &alice,
            &server,
            json!({
                "kind": "follow",
                "target_user_id": bob.id,
                "link": format!("/users/{}", alice.id),
            }),
        );
    }

    assert_eq!(unread_count(&bob, &server), 3);
}

#[test]
fn unread_count_after_mark_read() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let n = create_notification(
        &alice,
        &server,
        json!({
            "kind": "follow",
            "target_user_id": bob.id,
            "link": format!("/users/{}", alice.id),
        }),
    );

    assert_eq!(unread_count(&bob, &server), 1);

    let id = n["id"].as_str().unwrap();
    let r = bob
        .client
        .patch(server.url(&format!("/api/v1/my/notifications/{}/read", id)))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(unread_count(&bob, &server), 0);
}

#[test]
fn unread_count_after_mark_all_read() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    for _ in 0..3 {
        create_notification(
            &alice,
            &server,
            json!({
                "kind": "follow",
                "target_user_id": bob.id,
                "link": format!("/users/{}", alice.id),
            }),
        );
    }

    let r = bob
        .client
        .post(server.url("/api/v1/my/notifications/read-all"))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["marked"], 3);
    assert_eq!(unread_count(&bob, &server), 0);
}

#[test]
fn unread_count_requires_auth() {
    let server = TestServer::start();

    let r = reqwest::blocking::Client::new()
        .get(server.url("/api/v1/my/notifications/unread-count"))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn mark_read_success() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let n = create_notification(
        &alice,
        &server,
        json!({
            "kind": "follow",
            "target_user_id": bob.id,
            "link": format!("/users/{}", alice.id),
        }),
    );
    let id = n["id"].as_str().unwrap();

    let r = bob
        .client
        .patch(server.url(&format!("/api/v1/my/notifications/{}/read", id)))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let body: Value = r.json().unwrap();
    assert_eq!(body["is_readed"], true);
}

#[test]
fn mark_read_nonexistent_returns_404() {
    let server = TestServer::start();
    let bob = register_and_login(&server.base);

    let r = bob
        .client
        .patch(server.url(&format!("/api/v1/my/notifications/{}/read", Uuid::new_v4())))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}

#[test]
fn mark_read_other_users_returns_404() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let n = create_notification(
        &alice,
        &server,
        json!({
            "kind": "follow",
            "target_user_id": bob.id,
            "link": format!("/users/{}", alice.id),
        }),
    );
    let id = n["id"].as_str().unwrap();

    let r = alice
        .client
        .patch(server.url(&format!("/api/v1/my/notifications/{}/read", id)))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);

    assert_eq!(unread_count(&bob, &server), 1);
}

#[test]
fn mark_read_requires_auth() {
    let server = TestServer::start();

    let r = reqwest::blocking::Client::new()
        .patch(server.url(&format!("/api/v1/my/notifications/{}/read", Uuid::new_v4())))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn mark_all_read_empty_returns_zero() {
    let server = TestServer::start();
    let bob = register_and_login(&server.base);

    let r = bob
        .client
        .post(server.url("/api/v1/my/notifications/read-all"))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["marked"], 0);
}

#[test]
fn mark_all_read_requires_auth() {
    let server = TestServer::start();

    let r = reqwest::blocking::Client::new()
        .post(server.url("/api/v1/my/notifications/read-all"))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn delete_success() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let n = create_notification(
        &alice,
        &server,
        json!({
            "kind": "follow",
            "target_user_id": bob.id,
            "link": format!("/users/{}", alice.id),
        }),
    );
    let id = n["id"].as_str().unwrap();

    let r = bob
        .client
        .delete(server.url(&format!("/api/v1/my/notifications/{}", id)))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    assert!(list_notifications(&bob, &server).is_empty());
}

#[test]
fn delete_nonexistent_returns_404() {
    let server = TestServer::start();
    let bob = register_and_login(&server.base);

    let r = bob
        .client
        .delete(server.url(&format!("/api/v1/my/notifications/{}", Uuid::new_v4())))
        .bearer_auth(&bob.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);
}

#[test]
fn delete_other_users_returns_404() {
    let server = TestServer::start();
    let alice = register_and_login(&server.base);
    let bob = register_and_login(&server.base);

    let n = create_notification(
        &alice,
        &server,
        json!({
            "kind": "follow",
            "target_user_id": bob.id,
            "link": format!("/users/{}", alice.id),
        }),
    );
    let id = n["id"].as_str().unwrap();

    let r = alice
        .client
        .delete(server.url(&format!("/api/v1/my/notifications/{}", id)))
        .bearer_auth(&alice.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 404);

    assert_eq!(list_notifications(&bob, &server).len(), 1);
}

#[test]
fn delete_requires_auth() {
    let server = TestServer::start();

    let r = reqwest::blocking::Client::new()
        .delete(server.url(&format!("/api/v1/my/notifications/{}", Uuid::new_v4())))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}
