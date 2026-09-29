use actix_web::{App, HttpServer, middleware::Logger};
use backend::{bootstrap, routes};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let state = bootstrap::setup::run().expect("Bootstrap failed");
    let host = state.config.server.host.clone();
    let port = state.config.server.port;

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .wrap(Logger::default())
            .configure(routes::init)
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
