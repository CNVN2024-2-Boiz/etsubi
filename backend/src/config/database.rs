use std::env;

pub struct DatabaseConfig {
    pub url: String,
}

impl DatabaseConfig {
    pub fn from_env() -> Self {
        Self {
            url: env::var("DATABASE_URL").expect("Please setup DATABASE_URL properly"),
        }
    }
}

#[test]
fn test_database_url() {
    dotenvy::dotenv().ok();
    let a = DatabaseConfig::from_env();
    println!("{}", a.url);
}
