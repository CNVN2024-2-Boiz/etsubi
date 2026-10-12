use actix_web::{Responder, get};

#[utoipa::path(
    get,
    path = "/health",
    tag = "system",
    responses(
        (status = 200, description = "Service healthy", body = String)
    ),
)]
#[get("/health")]
pub async fn health() -> impl Responder {
    "OK"
}
