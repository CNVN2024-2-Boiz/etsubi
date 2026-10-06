use crate::presentation;
use actix_web::web;

pub fn public(cfg: &mut web::ServiceConfig) {
    cfg.service(presentation::support::health::health);

    cfg.service(presentation::handlers::auth_handler::register);
    cfg.service(presentation::handlers::auth_handler::login);

    cfg.service(presentation::handlers::user_handler::get_user);

    cfg.service(presentation::handlers::post_handler::get_post);
    cfg.service(presentation::handlers::post_handler::list_user_posts);
}

pub fn protected(cfg: &mut web::ServiceConfig) {
    cfg.service(presentation::handlers::user_handler::get_personal_info);

    cfg.service(presentation::handlers::user_handler::update_user);
    cfg.service(presentation::handlers::user_handler::update_status);
    cfg.service(presentation::handlers::user_handler::update_role);

    cfg.service(presentation::handlers::post_handler::create_post);

    cfg.service(presentation::handlers::post_handler::list_my_posts);
    cfg.service(presentation::handlers::post_handler::get_my_post);

    cfg.service(presentation::handlers::post_handler::update_post);
    cfg.service(presentation::handlers::post_handler::update_post_status);
    cfg.service(presentation::handlers::post_handler::delete_post);
}
