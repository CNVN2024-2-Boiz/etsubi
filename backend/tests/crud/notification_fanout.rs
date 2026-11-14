use serde_json::{Value, json};
use uuid::Uuid;

use crate::common::{TestServer, TestUser, register_and_login, set_status_in_db};

fn create_post(user: &TestUser, server: &TestServer, title: &str) -> Uuid {
    let r = user
        .client
        .post(server.url("/api/v1/posts"))
        .bearer_auth(&user.token)
        .json(&json!({"title": title, "content": "body"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201, "create post: {:?}", r.text());
    r.json::<Value>().unwrap()["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap()
}

fn follow(follower: &TestUser, followed_id: Uuid, server: &TestServer) {
    let r = follower
        .client
        .post(server.url(&format!("/api/v1/users/{}/follow", followed_id)))
        .bearer_auth(&follower.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);
}

fn fanout(user: &TestUser, server: &TestServer, post_id: Uuid) -> reqwest::blocking::Response {
    user.client
        .post(server.url(&format!("/api/v1/posts/{}/notify-followers", post_id)))
        .bearer_auth(&user.token)
        .send()
        .unwrap()
}

fn fanout_count(user: &TestUser, server: &TestServer, post_id: Uuid) -> i64 {
    let r = fanout(user, server, post_id);
    assert_eq!(r.status(), 200, "fanout: {:?}", r.text());
    r.json::<Value>().unwrap()["notified"].as_i64().unwrap()
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

#[test]
fn fanout_notifies_all_followers() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let f1 = register_and_login(&server.base);
    let f2 = register_and_login(&server.base);
    let f3 = register_and_login(&server.base);

    follow(&f1, author.id, &server);
    follow(&f2, author.id, &server);
    follow(&f3, author.id, &server);

    let post_id = create_post(&author, &server, "Hello world");
    let notified = fanout_count(&author, &server, post_id);
    assert_eq!(notified, 3);

    for follower in [&f1, &f2, &f3] {
        let list = list_notifications(follower, &server);
        assert_eq!(list.len(), 1);
        assert_eq!(list[0]["kind"], "post_created");
        assert_eq!(list[0]["link"], format!("/posts/{}", post_id));
        assert!(list[0]["message"].as_str().unwrap().contains("Hello world"));
    }
}

#[test]
fn fanout_empty_followers_returns_zero() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);

    let post_id = create_post(&author, &server, "Lonely post");
    let notified = fanout_count(&author, &server, post_id);
    assert_eq!(notified, 0);
}

#[test]
fn fanout_does_not_notify_author() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);

    let post_id = create_post(&author, &server, "My post");
    let notified = fanout_count(&author, &server, post_id);
    assert_eq!(notified, 1);

    assert!(list_notifications(&author, &server).is_empty());
}

#[test]
fn fanout_message_and_link_format() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);

    let post_id = create_post(&author, &server, "Specific title");
    fanout_count(&author, &server, post_id);

    let list = list_notifications(&follower, &server);
    assert_eq!(list.len(), 1);

    let msg = list[0]["message"].as_str().unwrap();
    assert!(msg.contains(&author.id.to_string()) || msg.contains("New post from"));
    assert!(msg.contains("Specific title"));

    assert_eq!(list[0]["link"], format!("/posts/{}", post_id));
}

#[test]
fn fanout_only_author_can_trigger() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let other = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);

    let post_id = create_post(&author, &server, "Post");

    let r = fanout(&other, &server, post_id);
    assert_eq!(r.status(), 403);

    assert!(list_notifications(&follower, &server).is_empty());
}

#[test]
fn fanout_requires_auth() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);

    let post_id = create_post(&author, &server, "Post");

    let r = reqwest::blocking::Client::new()
        .post(server.url(&format!("/api/v1/posts/{}/notify-followers", post_id)))
        .send()
        .unwrap();
    assert_eq!(r.status(), 401);
}

#[test]
fn fanout_missing_post_returns_404() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);

    let r = fanout(&author, &server, Uuid::new_v4());
    assert_eq!(r.status(), 404);
}

#[test]
fn fanout_deleted_post_returns_404() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);

    let post_id = create_post(&author, &server, "Post");

    let r = author
        .client
        .delete(server.url(&format!("/api/v1/posts/{}", post_id)))
        .bearer_auth(&author.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = fanout(&author, &server, post_id);
    assert_eq!(r.status(), 404);

    assert!(list_notifications(&follower, &server).is_empty());
}

#[test]
fn fanout_hidden_post_returns_404() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);

    let post_id = create_post(&author, &server, "Post");

    crate::common::set_role_in_db(&author.email, "admin");
    let r = author
        .client
        .patch(server.url(&format!("/api/v1/manage/posts/{}/status", post_id)))
        .bearer_auth(&author.token)
        .json(&json!({"status": "hidden"}))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);

    let r = fanout(&author, &server, post_id);
    assert_eq!(r.status(), 404);

    assert!(list_notifications(&follower, &server).is_empty());
}

#[test]
fn fanout_notifies_banned_follower() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);
    set_status_in_db(&follower.email, "banned");

    let post_id = create_post(&author, &server, "Post");
    let notified = fanout_count(&author, &server, post_id);
    assert_eq!(notified, 1);
}

#[test]
fn fanout_skips_unfollowed_user() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);

    let r = follower
        .client
        .delete(server.url(&format!("/api/v1/users/{}/follow", author.id)))
        .bearer_auth(&follower.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let post_id = create_post(&author, &server, "Post");
    let notified = fanout_count(&author, &server, post_id);
    assert_eq!(notified, 0);

    assert!(list_notifications(&follower, &server).is_empty());
}

#[test]
fn fanout_second_call_returns_zero() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let f1 = register_and_login(&server.base);
    let f2 = register_and_login(&server.base);

    follow(&f1, author.id, &server);
    follow(&f2, author.id, &server);

    let post_id = create_post(&author, &server, "Post");

    assert_eq!(fanout_count(&author, &server, post_id), 2);
    assert_eq!(fanout_count(&author, &server, post_id), 0);
    assert_eq!(fanout_count(&author, &server, post_id), 0);
}

#[test]
fn fanout_idempotent_does_not_duplicate_notifications() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);

    let post_id = create_post(&author, &server, "Post");

    fanout_count(&author, &server, post_id);
    fanout_count(&author, &server, post_id);
    fanout_count(&author, &server, post_id);

    let list = list_notifications(&follower, &server);
    assert_eq!(list.len(), 1);
}

#[test]
fn different_posts_create_separate_notifications() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);

    let post1 = create_post(&author, &server, "First");
    let post2 = create_post(&author, &server, "Second");

    assert_eq!(fanout_count(&author, &server, post1), 1);
    assert_eq!(fanout_count(&author, &server, post2), 1);

    let list = list_notifications(&follower, &server);
    assert_eq!(list.len(), 2);

    let links: Vec<&str> = list.iter().map(|n| n["link"].as_str().unwrap()).collect();
    assert!(links.iter().any(|l| *l == format!("/posts/{}", post1)));
    assert!(links.iter().any(|l| *l == format!("/posts/{}", post2)));
}

#[test]
fn fanout_does_not_dedup_against_other_kinds() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);

    let r = follower
        .client
        .post(server.url("/api/v1/notifications"))
        .bearer_auth(&follower.token)
        .json(&json!({
            "kind": "follow",
            "target_user_id": author.id,
            "link": format!("/users/{}", follower.id),
        }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201);

    let post_id = create_post(&author, &server, "Post");
    let notified = fanout_count(&author, &server, post_id);
    assert_eq!(notified, 1);

    let list = list_notifications(&follower, &server);
    assert_eq!(list.len(), 1);
}

#[test]
fn fanout_notifications_are_unread() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);

    let post_id = create_post(&author, &server, "Post");
    fanout_count(&author, &server, post_id);

    let r = follower
        .client
        .get(server.url("/api/v1/my/notifications/unread-count"))
        .bearer_auth(&follower.token)
        .send()
        .unwrap();
    let count = r.json::<Value>().unwrap()["count"].as_i64().unwrap();
    assert_eq!(count, 1);
}

#[test]
fn fanout_notification_can_be_marked_read() {
    let server = TestServer::start();
    let author = register_and_login(&server.base);
    let follower = register_and_login(&server.base);

    follow(&follower, author.id, &server);

    let post_id = create_post(&author, &server, "Post");
    fanout_count(&author, &server, post_id);

    let list = list_notifications(&follower, &server);
    let id = list[0]["id"].as_str().unwrap();

    let r = follower
        .client
        .patch(server.url(&format!("/api/v1/my/notifications/{}/read", id)))
        .bearer_auth(&follower.token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    assert_eq!(r.json::<Value>().unwrap()["is_readed"], true);
}
