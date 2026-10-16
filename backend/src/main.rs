use actix_cors::Cors;
use actix_web::{App, HttpServer, http::header, middleware::Logger};
use backend::{bootstrap, presentation::openapi::ApiDoc, routes};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    openssl::init();
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let state = bootstrap::run().expect("Bootstrap failed");
    let host = state.config.server_host.clone();
    let port = state.config.server_port;
    let frontend_url = state.config.frontend_url.clone();

    tracing::info!("CORS allowing origin: {}", frontend_url);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin(&frontend_url)
            .allowed_methods(vec!["GET", "POST", "PATCH", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                header::AUTHORIZATION,
                header::CONTENT_TYPE,
                header::ACCEPT,
            ])
            .supports_credentials()
            .max_age(3600);

        App::new()
            .app_data(state.clone())
            .wrap(cors)
            .wrap(Logger::default())
            .service(
                SwaggerUi::new("/swagger-ui/{_:.*}")
                    .url("/api-docs/openapi.json", ApiDoc::openapi()),
            )
            .configure(routes::configure)
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
