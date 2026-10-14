use crate::infrastructure::security::middleware::auth_middleware;
use crate::presentation;
use actix_web::{middleware, web};

pub fn public(cfg: &mut web::ServiceConfig) {
    cfg.service(presentation::handlers::health_handler::health);

    cfg.service(presentation::handlers::auth_handler::register);
    cfg.service(presentation::handlers::auth_handler::login);

    cfg.service(presentation::handlers::user_handler::get_user);

    cfg.service(presentation::handlers::post_handler::get_post);
    cfg.service(presentation::handlers::post_handler::list_user_posts);
}

pub fn protected(cfg: &mut web::ServiceConfig) {
    cfg.service(presentation::handlers::user_handler::get_personal_info);
    cfg.service(presentation::handlers::user_handler::update_user);

    cfg.service(presentation::handlers::manage_handler::update_post_status);
    cfg.service(presentation::handlers::manage_handler::update_user_status);
    cfg.service(presentation::handlers::manage_handler::update_user_role);
    cfg.service(presentation::handlers::manage_handler::restore_post);

    cfg.service(presentation::handlers::post_handler::create_post);
    cfg.service(presentation::handlers::post_handler::list_my_posts);
    cfg.service(presentation::handlers::post_handler::update_post);
    cfg.service(presentation::handlers::post_handler::delete_post);
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1").configure(public).service(
            web::scope("")
                .wrap(middleware::from_fn(auth_middleware))
                .configure(protected),
        ),
    );
}
