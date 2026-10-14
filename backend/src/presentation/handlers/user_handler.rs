use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, get, patch, web};

use uuid::Uuid;

use crate::{
    bootstrap::state::AppState,
    infrastructure::security::extractor::CurrentUser,
    presentation::dto::user_dto::{UpdateProfileRequest, UserResponse},
};

#[utoipa::path(
    get,
    path = "/api/v1/my",
    tag = "user",
    responses(
        (status = 200, description = "Current user profile", body = UserResponse),
        (status = 401, description = "Not authenticated"),
        (status = 404, description = "User not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my")]
pub async fn get_personal_info(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let user_id = user.id;

    let me = web::block(move || service.get(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(UserResponse::from(me)))
}

#[utoipa::path(
    get,
    path = "/api/v1/users/{id}",
    tag = "user",
    params(
        ("id" = Uuid, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "User profile", body = UserResponse),
        (status = 404, description = "User not found"),
    ),
)]
#[get("/users/{id}")]
pub async fn get_user(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let user_id = path.into_inner();

    let user = web::block(move || service.get(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(UserResponse::from(user)))
}

#[utoipa::path(
    patch,
    path = "/api/v1/users/{id}",
    tag = "user",
    params(
        ("id" = Uuid, Path, description = "ID of the user to update")
    ),
    request_body = UpdateProfileRequest,
    responses(
        (status = 200, description = "Profile updated", body = UserResponse),
        (status = 400, description = "Invalid payload"),
        (status = 403, description = "Not allowed to edit this profile"),
        (status = 404, description = "User not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/users/{id}")]
pub async fn update_user(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, Error> {
    let target_id = path.into_inner();
    let requester_id = user.id;
    let requester_is_admin = user.is_admin();

    let req = body.into_inner();
    let username = req.username;
    let email = req.email;
    let bio = req.bio;
    let avatar_url = req.avatar_url;

    let service = state.user_service.clone();

    let updated = web::block(move || {
        service.update_profile(
            target_id,
            requester_id,
            requester_is_admin,
            username,
            email,
            bio,
            avatar_url,
        )
    })
    .await
    .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(UserResponse::from(updated)))
}
