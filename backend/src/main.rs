use actix_governor::{Governor, GovernorConfigBuilder};
use actix_web::{App, HttpServer, middleware::Logger};
use backend::{bootstrap, cors, presentation::openapi::ApiDoc, routes};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let rate_limiter = GovernorConfigBuilder::default()
        .requests_per_second(4)
        .burst_size(7)
        .finish()
        .unwrap();

    let state = bootstrap::run().expect("Bootstrap failed");
    let host = state.config.server_host.clone();
    let port = state.config.server_port;
    let origins = state.config.cors_allowed_origins.clone();

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .wrap(Logger::default())
            .wrap(Governor::new(&rate_limiter))
            .wrap(cors::build(&origins))
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
