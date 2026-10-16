use crate::bootstrap::state::AppState;
use actix_web::{HttpResponse, Responder, get, web};

#[utoipa::path(
    get,
    path = "/health",
    tag = "system",
    responses(
        (status = 200, description = "Service healthy", body = String)
    ),
)]
#[get("/health")]
pub async fn health(state: web::Data<AppState>) -> impl Responder {
    let pool = state.pool.clone();
    match web::block(move || pool.get()).await {
        Ok(Ok(_)) => HttpResponse::Ok().body("OK"),
        _ => HttpResponse::ServiceUnavailable().body("DB unavailable"),
    }
}
