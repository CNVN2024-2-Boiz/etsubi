use crate::modules::health;
use actix_web::web;

pub fn init(cfg: &mut web::ServiceConfig) {
    cfg.service(health::handler::health);
}
