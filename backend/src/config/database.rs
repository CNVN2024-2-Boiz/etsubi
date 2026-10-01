use std::env;

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub name: String,
    pub password: String,
    pub user: String,
    pub url: String,
    pub port: u16,
}

impl DatabaseConfig {
    pub fn from_env() -> Self {
        Self {
            name: env::var("DATABASE_NAME").expect("Please setup DATABASE_URL properly"),
            password: env::var("DATABASE_PASSWORD").expect("Please setup DATABASE_URL properly"),
            user: env::var("DATABASE_USER").expect("Please setup DATABASE_URL properly"),
            url: env::var("DATABASE_URL").expect("Please setup DATABASE_URL properly"),
            port: env::var("DATABASE_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(5432),
        }
    }
}

#[test]
fn test_database_url() {
    dotenvy::dotenv().ok();
    let a = DatabaseConfig::from_env();
    println!("{}", a.url);
}
