use dotenvy::dotenv;
use std::env;

pub struct DbConfig {
    pub name: String,
    pub url: String,
    pub port: u16,
}

impl DbConfig {
    pub fn from_env() -> Self {
        let name = env::var("DATABASE_NAME").expect("DATABASE_NAME must be set");

        let url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

        let port = env::var("DATABASE_PORT")
            .expect("DATABASE_PORT must be set")
            .parse::<u16>()
            .expect("DATABASE_PORT must be a valid u16");

        Self { name, url, port }
    }
}

#[test]
fn try_db_config() {
    let cfg = DbConfig::from_env();

    println!("name = {}", cfg.name);
    println!("url  = {}", cfg.url);
    println!("port = {}", cfg.port);
}

pub struct AdminConfig {
    pub username: String,
    pub password: String,
    pub email: String,
}

impl AdminConfig {
    pub fn from_env() -> Self {
        let username = env::var("ADMIN_USERNAME").expect("ADMIN_NAME must be set");
        let password = env::var("ADMIN_PASSWORD").expect("ADMIN_PASSWORD must be set");
        let email = env::var("ADMIN_EMAIL").expect("ADMIN_EMAIL must be set");

        Self {
            username,
            password,
            email,
        }
    }
}

pub struct AppConfig {
    pub db: DbConfig,
    pub admin: AdminConfig,
    pub jwt_key: String,
    pub port: u16,
}

impl AppConfig {
    pub fn from_env() -> Self {
        dotenv().ok();
        let db = DbConfig::from_env();
        let admin = AdminConfig::from_env();
        let jwt_key = env::var("JWT_KEY").expect("JWT_KEY must be set");
        let port = env::var("APPLICATION_PORT")
            .expect("PORT must be set")
            .parse::<u16>()
            .unwrap();

        Self {
            db,
            admin,
            jwt_key,
            port,
        }
    }
}

#[test]
fn try_app_config() {
    let config = AppConfig::from_env();

    let line = "─".repeat(70);

    println!();
    println!("┌{}┐", line);
    println!("│ {:^68} │", "APP CONFIG");
    println!("├{}┤", line);

    println!("│ {:^68} │", "DATABASE");
    println!("│   {:<14} : {}", "name", config.db.name);
    println!("│   {:<14} : {}", "url", config.db.url);
    println!("│   {:<14} : {}", "port", config.db.port);
    println!("├{}┤", line);

    println!("│ {:^68} │", "ADMIN");
    println!("│   {:<14} : {}", "username", config.admin.username);
    println!("│   {:<14} : {}", "email", config.admin.email);
    println!(
        "│   {:<14} : {}",
        "password",
        "*".repeat(config.admin.password.len())
    );
    println!("├{}┤", line);

    println!("│ {:^68} │", "APP");
    println!(
        "│   {:<14} : {}",
        "jwt_key",
        "*".repeat(config.jwt_key.len())
    );
    println!("│   {:<14} : {}", "port", config.port);
    println!("└{}┘", line);
    println!();
}
