use actix_web::{App, HttpServer, web};
use backend::{config::AppConfig, database::pool, routes, state::AppState};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let config = AppConfig::from_env();
    let db = pool::init(&config.db.url);
    let port = config.port;
    let state = web::Data::new(AppState { db, config });

    HttpServer::new(move || App::new().app_data(state.clone()).configure(routes::init))
        .bind(("0.0.0.0", port))?
        .run()
        .await
}
