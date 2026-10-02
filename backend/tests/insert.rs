use backend::bootstrap::pool;
use backend::infrastructure::database::{
    models::entities::{NewUser, User},
    schema::users,
};
use diesel::prelude::*;
use std::time::{SystemTime, UNIX_EPOCH};

fn get_pool() -> pool::DbPool {
    dotenvy::dotenv().ok();
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    pool::init(&url)
}

fn unique_email() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("test_{}@example.com", nanos)
}

#[test]
#[ignore]
fn test_insert_user() {
    let pool = get_pool();
    let email = unique_email();
    let username = format!("user_{}", &email[5..15]);

    {
        let mut conn = pool.get().expect("Failed to get connection");

        let new_user = NewUser {
            username: &username,
            email: &email,
            password: "hashed_password_here",
            status: "active",
        };

        let user: User = diesel::insert_into(users::table)
            .values(&new_user)
            .get_result(&mut conn)
            .expect("Failed to insert user");

        println!("[TEST] Inserted user id={}", user.id);

        assert_eq!(user.username, username);
        assert_eq!(user.email, email);

        let total: i64 = users::table
            .count()
            .get_result(&mut conn)
            .expect("Failed to count");

        println!("[TEST] Total users in DB: {}", total);
    }

    drop(pool);

    println!("[TEST] DONE");
}
