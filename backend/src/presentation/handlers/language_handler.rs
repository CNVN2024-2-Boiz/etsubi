use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, get, web};
use uuid::Uuid;

use crate::{bootstrap::state::AppState, presentation::dto::language_dto::LanguageResponse};

#[utoipa::path(
    get,
    path = "/api/v1/languages",
    tag = "language",
    responses(
        (status = 200, description = "All supported languages", body = [LanguageResponse]),
    ),
)]
#[get("/languages")]
pub async fn list_languages(state: web::Data<AppState>) -> Result<HttpResponse, Error> {
    let service = state.language_service.clone();
    let languages = web::block(move || service.list_all())
        .await
        .map_err(ErrorInternalServerError)??;
    let resp: Vec<LanguageResponse> = languages.into_iter().map(LanguageResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/api/v1/users/{id}/languages",
    tag = "language",
    params(("id" = Uuid, Path, description = "User ID")),
    responses(
        (status = 200, description = "Languages the user speaks", body = [LanguageResponse]),
    ),
)]
#[get("/users/{id}/languages")]
pub async fn list_user_languages(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let user_id = path.into_inner();
    let service = state.language_service.clone();
    let languages = web::block(move || service.list_by_user(user_id))
        .await
        .map_err(ErrorInternalServerError)??;
    let resp: Vec<LanguageResponse> = languages.into_iter().map(LanguageResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}
