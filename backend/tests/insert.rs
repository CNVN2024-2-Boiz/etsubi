use std::sync::Arc;

use backend::{
    bootstrap::pool, infrastructure::database::repositories::user_repo::PostgresUserRepo,
    modules::user::service::UserService,
};

#[test]
#[ignore]
fn test_insert_user() {
    dotenvy::dotenv().ok();

    let pool = pool::init(&std::env::var("DATABASE_URL").unwrap());
    let repo = Arc::new(PostgresUserRepo::new(pool.clone()));
    let service = UserService::new(repo);

    let user = service
        .create("bob", "bob@test.com", "12345678")
        .expect("Failed");

    println!("Inserted: id={}, email={}", user.id, user.email);

    drop(service);
    drop(pool);
}
