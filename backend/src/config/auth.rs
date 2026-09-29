use std::env;

pub struct AuthConfig {
    pub jwt_key: String,
}

impl AuthConfig {
    pub fn from_env() -> Self {
        Self {
            jwt_key: env::var("JWT_KEY").expect("Please setup JWT_KEY properly"),
        }
    }
}

#[test]
fn get_jwt() {
    dotenvy::dotenv().ok();
    let a = AuthConfig::from_env();
    println!("{}", a.jwt_key);
}
