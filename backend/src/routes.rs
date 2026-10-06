use crate::presentation;
use actix_web::web;

pub fn public(cfg: &mut web::ServiceConfig) {
    cfg.service(presentation::support::health::health);
    cfg.service(presentation::handlers::auth_handler::register);
    cfg.service(presentation::handlers::auth_handler::login);
    cfg.service(presentation::handlers::user_handler::get_user);
}

pub fn protected(cfg: &mut web::ServiceConfig) {
    cfg.service(presentation::handlers::user_handler::update_user);
    cfg.service(presentation::handlers::user_handler::update_status);
    cfg.service(presentation::handlers::user_handler::update_role);
}
