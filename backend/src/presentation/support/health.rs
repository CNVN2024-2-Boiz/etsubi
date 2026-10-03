use actix_web::{Responder, get};

#[get("/health")]
pub async fn health() -> impl Responder {
    "OK"
}
