use actix_web::{
    Error, HttpResponse, delete,
    error::{ErrorBadRequest, ErrorForbidden, ErrorInternalServerError},
    get, patch, put, web,
};

use crate::{
    bootstrap::state::AppState,
    infrastructure::security::extractor::AuthUser,
    presentation::dto::user_dto::{
        AssignRoleRequest, PublicUserResponse, UpdateProfileRequest, UpdateStatusRequest,
        UserResponse,
    },
};

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

    Ok(HttpResponse::Ok().json(PublicUserResponse::from(user)))
}

#[patch("/users/{id}")]
pub async fn update_user(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<i64>,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, Error> {
    let target_id = path.into_inner();

    if target_id != user.id && !user.is_admin() {
        return Err(ErrorForbidden("Cannot edit other user"));
    }

    let service = state.user_service.clone();
    let req = body.into_inner();

    let updated = web::block(move || service.update_profile(target_id, req))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|e| ErrorBadRequest(e.to_string()))?;

    Ok(HttpResponse::Ok().json(UserResponse::from(updated)))
}

#[patch("/users/{id}/status")]
pub async fn update_status(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<i64>,
    body: web::Json<UpdateStatusRequest>,
) -> Result<HttpResponse, Error> {
    if !user.is_moderator() {
        return Err(ErrorForbidden("Requires moderator or admin"));
    }

    let service = state.user_service.clone();
    let target_id = path.into_inner();
    let status = body.into_inner().status;

    let updated = web::block(move || service.update_status(target_id, &status))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|e| ErrorBadRequest(e.to_string()))?;

    Ok(HttpResponse::Ok().json(UserResponse::from(updated)))
}

#[get("/users/{id}/roles")]
pub async fn get_roles(
    state: web::Data<AppState>,
    path: web::Path<i64>,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let target_id = path.into_inner();

    let roles = web::block(move || service.get_roles(target_id))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|e| ErrorBadRequest(e.to_string()))?;

    Ok(HttpResponse::Ok().json(roles))
}

#[put("/users/{id}/roles")]
pub async fn assign_role(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<i64>,
    body: web::Json<AssignRoleRequest>,
) -> Result<HttpResponse, Error> {
    if !user.is_admin() {
        return Err(ErrorForbidden("Requires admin"));
    }

    let target_id = path.into_inner();
    let role_name = body.into_inner().role_name;

    if role_name == "admin" {
        return Err(ErrorForbidden("Cannot assign admin role"));
    }

    if !matches!(role_name.as_str(), "user" | "moderator") {
        return Err(ErrorBadRequest("Invalid role"));
    }

    let service = state.user_service.clone();
    web::block(move || service.assign_role(target_id, &role_name))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|e| ErrorBadRequest(e.to_string()))?;

    Ok(HttpResponse::Ok().finish())
}

#[delete("/users/{id}/roles/{role_name}")]
pub async fn remove_role(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<(i64, String)>,
) -> Result<HttpResponse, Error> {
    if !user.is_admin() {
        return Err(ErrorForbidden("Requires admin"));
    }

    let (target_id, role_name) = path.into_inner();

    if matches!(role_name.as_str(), "admin" | "user") {
        return Err(ErrorForbidden("Cannot remove this role"));
    }

    let service = state.user_service.clone();
    web::block(move || service.remove_role(target_id, &role_name))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|e| ErrorBadRequest(e.to_string()))?;

    Ok(HttpResponse::NoContent().finish())
}
