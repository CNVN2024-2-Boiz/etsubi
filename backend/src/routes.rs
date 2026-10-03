use crate::presentation;
use actix_web::web;

pub fn public(cfg: &mut web::ServiceConfig) {
    cfg.service(presentation::support::health::health);
    cfg.service(presentation::handlers::auth_handler::register);
    cfg.service(presentation::handlers::auth_handler::login);
}

pub fn protected(cfg: &mut web::ServiceConfig) {
    cfg.service(presentation::handlers::user_handler::get_user);
}
