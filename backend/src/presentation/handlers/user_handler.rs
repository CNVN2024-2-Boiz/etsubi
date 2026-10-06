use actix_web::{
    Error, HttpResponse,
    error::{ErrorBadRequest, ErrorForbidden, ErrorInternalServerError},
    get, patch, web,
};

use crate::{
    bootstrap::state::AppState,
    infrastructure::security::extractor::AuthUser,
    presentation::dto::user_dto::{
        UpdateProfileRequest, UpdateRoleRequest, UpdateStatusRequest, UserResponse,
    },
};

#[get("/my")]
pub async fn get_personal_info(
    state: web::Data<AppState>,
    user: AuthUser,
) -> Result<HttpResponse, Error> {
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

#[patch("/users/{id}")]
pub async fn update_user(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<i64>,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, Error> {
    let target_id = path.into_inner();
    let requester_id = user.id;
    let requester_is_admin = user.is_admin();
    let req = body.into_inner();

    let service = state.user_service.clone();

    let updated = web::block(move || {
        service.update_profile(target_id, requester_id, requester_is_admin, req)
    })
    .await
    .map_err(ErrorInternalServerError)?
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("only edit your own") {
            ErrorForbidden(msg)
        } else {
            ErrorBadRequest(msg)
        }
    })?;

    Ok(HttpResponse::Ok().json(UserResponse::from(updated)))
}

#[patch("/users/{id}/status")]
pub async fn update_status(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<i64>,
    body: web::Json<UpdateStatusRequest>,
) -> Result<HttpResponse, Error> {
    if !user.is_staff() {
        return Err(ErrorForbidden("Requires moderator or admin"));
    }

    let target_id = path.into_inner();
    let requester_id = user.id;
    let requester_is_admin = user.is_admin();
    let status = body.into_inner().status;
    let service = state.user_service.clone();

    let updated = web::block(move || {
        service.update_status(target_id, requester_id, requester_is_admin, &status)
    })
    .await
    .map_err(ErrorInternalServerError)?
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("Cannot modify admin") || msg.contains("Cannot ban yourself") {
            ErrorForbidden(msg)
        } else {
            ErrorBadRequest(msg)
        }
    })?;

    Ok(HttpResponse::Ok().json(UserResponse::from(updated)))
}

#[patch("/users/{id}/role")]
pub async fn update_role(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<i64>,
    body: web::Json<UpdateRoleRequest>,
) -> Result<HttpResponse, Error> {
    if !user.is_admin() {
        return Err(ErrorForbidden("Requires admin"));
    }

    let target_id = path.into_inner();
    let requester_id = user.id;
    let role = body.into_inner().role;
    let service = state.user_service.clone();

    let updated = web::block(move || service.update_role(target_id, requester_id, &role))
        .await
        .map_err(ErrorInternalServerError)?
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("Cannot assign admin")
                || msg.contains("Cannot change your own")
                || msg.contains("Cannot change admin")
            {
                ErrorForbidden(msg)
            } else {
                ErrorBadRequest(msg)
            }
        })?;

    Ok(HttpResponse::Ok().json(UserResponse::from(updated)))
}
