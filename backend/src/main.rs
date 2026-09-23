use actix_web::{App, HttpServer, Result, get, web};
use diesel::prelude::*;
use dotenvy::dotenv;
use std::env;

pub fn establish_connection() -> PgConnection {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}

#[get("/{id}")]
async fn greet(path: web::Path<String>) -> Result<String> {
    let id = path.into_inner();
    Ok(format!("The id is: {}", id))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let pool = establish_connection();
    HttpServer::new(|| {
        App::new()
            .service(greet)
    })
    .bind(("127.0.0.1", 8081))?
    .run()
    .await
}

