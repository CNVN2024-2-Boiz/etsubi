use actix_web::{App, HttpServer};
use backend::bootstrap;
use reqwest::blocking::Client;
use serde_json::{Value, json};
use uuid::Uuid;

pub struct TestServer {
    pub base: String,
    handle: Option<actix_web::dev::ServerHandle>,
    join: Option<std::thread::JoinHandle<()>>,
}

impl TestServer {
    pub fn start() -> Self {
        let state = bootstrap::run().expect("bootstrap failed");
        let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("bind");
        let port = listener.local_addr().unwrap().port();

        let server = HttpServer::new(move || {
            App::new()
                .app_data(state.clone())
                .configure(backend::routes::configure)
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
                return Self {
                    base,
                    handle: Some(handle),
                    join: Some(join),
                };
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        panic!("server not ready after 5s");
    }

    pub fn url(&self, path: &str) -> String {
        format!("{}{}", self.base, path)
    }
}

impl Drop for TestServer {
    fn drop(&mut self) {
        if let Some(h) = self.handle.take() {
            futures::executor::block_on(h.stop(true));
        }
        if let Some(j) = self.join.take() {
            let _ = j.join();
        }
    }
}

pub struct TestUser {
    pub client: Client,
    pub token: String,
    pub id: Uuid,
    pub email: String,
}

impl Drop for TestUser {
    fn drop(&mut self) {
        cleanup_user(&self.email);
    }
}

pub fn register_and_login(base: &str) -> TestUser {
    let client = Client::new();
    let uid = Uuid::new_v4();
    let username = format!("test_{}", uid);
    let email = format!("test+{}@example.com", uid);
    let password = "password123";

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
    assert_eq!(r.status(), 201, "register failed: {:?}", r.text());

    let r = client
        .post(format!("{}/api/v1/auth/login", base))
        .json(&json!({ "email": email, "password": password }))
        .send()
        .unwrap();
    assert_eq!(r.status(), 200, "login failed: {:?}", r.text());
    let login: Value = r.json().unwrap();
    let token = login["token"].as_str().unwrap().to_string();
    let id: Uuid = login["user_id"].as_str().unwrap().parse().unwrap();

    TestUser {
        client,
        token,
        id,
        email,
    }
}

pub fn cleanup_user(email: &str) {
    use backend::infrastructure::database::schema::users;
    use diesel::prelude::*;

    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let pool = backend::bootstrap::pool::init(&url);
    let mut conn = pool.get().unwrap();
    match diesel::delete(users::table.filter(users::email.eq(email))).execute(&mut conn) {
        Ok(n) => eprintln!("[cleanup] deleted {} user(s) for {}", n, email),
        Err(e) => eprintln!("[cleanup] failed: {}", e),
    }
}

pub fn set_role_in_db(email: &str, role: &str) {
    use backend::infrastructure::database::schema::users;
    use diesel::prelude::*;

    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let pool = backend::bootstrap::pool::init(&url);
    let mut conn = pool.get().unwrap();
    diesel::update(users::table.filter(users::email.eq(email)))
        .set(users::role.eq(role))
        .execute(&mut conn)
        .expect("set role in db failed");
}
