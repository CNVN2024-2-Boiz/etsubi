use actix_cors::Cors;
use actix_web::http::header;

pub fn build(origins: &str) -> Cors {
    let trimmed = origins.trim();
    if trimmed.is_empty() || trimmed == "*" {
        return Cors::permissive();
    }

    let mut cors = Cors::default()
        .allowed_methods(vec!["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"])
        .allowed_headers(vec![
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCEPT,
        ])
        .max_age(3600);

    for origin in trimmed.split(',') {
        let origin = origin.trim();
        if !origin.is_empty() {
            cors = cors.allowed_origin(origin);
        }
    }
    cors
}
