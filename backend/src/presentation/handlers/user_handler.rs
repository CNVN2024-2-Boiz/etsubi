use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, get, web};

use crate::{
    bootstrap::state::AppState, infrastructure::security::extractor::AuthUser,
    presentation::dto::user_dto::UserResponse,
};

#[get("/users/me")]
pub async fn get_me(state: web::Data<AppState>, user: AuthUser) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let user_id = user.id;

    let me = web::block(move || service.get(user_id))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(UserResponse::from(me)))
}

#[get("/users/{id}")]
pub async fn get_user(
    state: web::Data<AppState>,
    path: web::Path<i64>,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let user_id = path.into_inner();

    let user = web::block(move || service.get(user_id))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(UserResponse::from(user)))
}
