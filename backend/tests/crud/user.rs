use actix_web::{App, HttpServer};
use backend::{bootstrap, routes};
use reqwest::blocking::Client;
use rstest::*;
use serde_json::json;
use uuid::Uuid;

fn start_server() -> (
    String,
    actix_web::dev::ServerHandle,
    std::thread::JoinHandle<()>,
) {
    let state = bootstrap::run().expect("bootstrap failed (kiểm tra DATABASE_URL / JWT_KEY)");
    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("bind");
    let port = listener.local_addr().unwrap().port();

    let server = HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .configure(routes::configure)
    })
    .listen(listener)
    .expect("listen")
    .run();

    let handle = server.handle();
    let join = std::thread::spawn(move || {
        actix_web::rt::System::new()
            .block_on(server)
            .expect("server error");
    });

    let base = format!("http://127.0.0.1:{}", port);

    for _ in 0..50 {
        if reqwest::blocking::get(format!("{}/api/v1/health", base)).is_ok() {
            return (base, handle, join);
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    panic!("server not ready after 5s");
}

fn cleanup_user(email: &str) {
    use backend::infrastructure::database::schema::users;
    use diesel::prelude::*;

    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let pool = backend::bootstrap::pool::init(&url);
    let mut conn = pool.get().unwrap();

    match diesel::delete(users::table.filter(users::email.eq(email))).execute(&mut conn) {
        Ok(n) => eprintln!("[cleanup] deleted {} user(s) matching {}", n, email),
        Err(e) => eprintln!("[cleanup] failed: {}", e),
    }
}

fn unique_creds() -> (String, String, String) {
    let uid = Uuid::new_v4();
    (
        format!("test_{}", uid),
        format!("test+{}@example.com", uid),
        "password123".to_string(),
    )
}

#[test]
fn full_auth_flow() {
    let (base, handle, join) = start_server();
    let client = Client::new();
    let (username, email, password) = unique_creds();

    let r = client
        .post(format!("{}/api/v1/auth/register", base))
        .json(&json!({
            "username": username,
            "email": email,
            "password": password,
            "language": "en",
        }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 201, "register body: {:?}", r.text());

    let r = client
        .post(format!("{}/api/v1/auth/login", base))
        .json(&json!({ "email": email, "password": password }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200, "login body: {:?}", r.text());
    let login: serde_json::Value = r.json().unwrap();
    let token = login["token"].as_str().expect("token missing").to_string();

    let r = client
        .get(format!("{}/api/v1/my", base))
        .bearer_auth(&token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 200);
    let me: serde_json::Value = r.json().unwrap();
    assert_eq!(me["email"], email, "email mismatch");
    assert_eq!(me["username"], username);
    assert_eq!(me["role"], "user");

    let r = client
        .post(format!("{}/api/v1/auth/logout", base))
        .bearer_auth(&token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 204);

    let r = client
        .get(format!("{}/api/v1/my", base))
        .bearer_auth(&token)
        .send()
        .unwrap();
    assert_eq!(r.status(), 401, "old token should be invalidated");

    cleanup_user(&email);
    futures::executor::block_on(handle.stop(true));
    join.join().ok();
}

#[rstest]
#[case::weak_password("test_user", "test@x.com", "short", "en", 400)]
#[case::bad_language("test_user", "test@x.com", "password123", "xx", 400)]
#[case::short_username("ab", "test@x.com", "password123", "en", 400)]
fn register_rejects_invalid_input(
    #[case] username: &str,
    #[case] email_local: &str,
    #[case] password: &str,
    #[case] language: &str,
    #[case] expected: u16,
) {
    let (base, handle, join) = start_server();
    let client = Client::new();
    let uid = Uuid::new_v4();
    let email = format!("test+{}@{}", uid, email_local.split('@').nth(1).unwrap());

    let r = client
        .post(format!("{}/api/v1/auth/register", base))
        .json(&json!({
            "username": username,
            "email": email,
            "password": password,
            "language": language,
        }))
        .send()
        .unwrap();

    assert_eq!(r.status(), expected, "body: {:?}", r.text());

    cleanup_user(&email);

    futures::executor::block_on(handle.stop(true));
    join.join().ok();
}

#[rstest]
#[case::wrong_password("wrong_pass", 401)]
#[case::no_such_user("whatever", 401)]
fn login_rejects_invalid_credentials(#[case] password: &str, #[case] expected: u16) {
    let (base, handle, join) = start_server();
    let client = Client::new();
    let uid = Uuid::new_v4();
    let email = format!("test+{}@example.com", uid);

    let r = client
        .post(format!("{}/api/v1/auth/login", base))
        .json(&json!({ "email": email, "password": password }))
        .send()
        .unwrap();
    assert_eq!(r.status(), expected);

    futures::executor::block_on(handle.stop(true));
    join.join().ok();
}
