use actix_web::{
    App, HttpServer,
    middleware::{self, Logger},
    web,
};
use backend::{
    bootstrap, infrastructure::security::middleware::auth_middleware,
    presentation::support::openapi::ApiDoc, routes,
};
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

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .wrap(Logger::default())
            .service(
                SwaggerUi::new("/swagger-ui/{_:.*}")
                    .url("/api-docs/openapi.json", ApiDoc::openapi()),
            )
            .service(
                web::scope("/api/v1").configure(routes::public).service(
                    web::scope("")
                        .wrap(middleware::from_fn(auth_middleware))
                        .configure(routes::protected),
                ),
            )
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
