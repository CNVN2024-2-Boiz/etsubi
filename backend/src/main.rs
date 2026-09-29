use actix_web::{App, HttpServer, middleware::Logger};
use backend::routes;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    HttpServer::new(|| App::new().wrap(Logger::default()).configure(routes::init))
        .bind(("127.0.0.1", 11432))?
        .run()
        .await
}
