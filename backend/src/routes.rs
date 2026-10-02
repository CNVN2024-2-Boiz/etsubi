use actix_web::web;

use crate::presentation;

pub fn public(cfg: &mut web::ServiceConfig) {
    cfg.service(presentation::handlers::health_handler::health);
}

pub fn protected(cfg: &mut web::ServiceConfig) {
    let _ = cfg;
}
