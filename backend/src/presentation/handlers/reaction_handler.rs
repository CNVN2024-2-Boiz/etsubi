use actix_web::{Error, HttpResponse, delete, error::ErrorInternalServerError, get, post, web};
use uuid::Uuid;

use crate::{
    bootstrap::state::AppState,
    presentation::dto::{
        auth_dto::AuthUser,
        reaction_dto::{ReactionResponse, ReactionSummaryItem, UpsertReactionRequest},
    },
};

#[utoipa::path(
    get,
    path = "/api/v1/posts/{post_id}/reactions",
    tag = "reaction",
    params(("post_id" = Uuid, Path, description = "Post ID")),
    responses(
        (status = 200, description = "All reactions on the post", body = [ReactionResponse]),
        (status = 404, description = "Post not available"),
    ),
)]
#[get("/posts/{post_id}/reactions")]
pub async fn list_post_reactions(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.reaction_service.clone();
    let post_id = path.into_inner();

    let reactions = web::block(move || service.list_by_post(post_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<ReactionResponse> = reactions.into_iter().map(ReactionResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/api/v1/posts/{post_id}/reactions/summary",
    tag = "reaction",
    params(("post_id" = Uuid, Path, description = "Post ID")),
    responses(
        (status = 200, description = "Reaction counts grouped by emoji", body = [ReactionSummaryItem]),
        (status = 404, description = "Post not available"),
    ),
)]
#[get("/posts/{post_id}/reactions/summary")]
pub async fn summary_post_reactions(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.reaction_service.clone();
    let post_id = path.into_inner();

    let summary = web::block(move || service.summary_by_post(post_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<ReactionSummaryItem> = summary
        .into_iter()
        .map(|(emoji, count)| ReactionSummaryItem { emoji, count })
        .collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/api/v1/posts/{post_id}/reactions/me",
    tag = "reaction",
    params(("post_id" = Uuid, Path, description = "Post ID")),
    responses(
        (status = 200, description = "My reaction", body = ReactionResponse),
        (status = 401, description = "Not authenticated"),
        (status = 404, description = "Not reacted"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/posts/{post_id}/reactions/me")]
pub async fn get_my_reaction(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.reaction_service.clone();
    let post_id = path.into_inner();
    let user_id = user.id;

    let reaction = web::block(move || service.get_mine(user_id, post_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(ReactionResponse::from(reaction)))
}

#[utoipa::path(
    post,
    path = "/api/v1/posts/{post_id}/reactions",
    tag = "reaction",
    params(("post_id" = Uuid, Path, description = "Post ID")),
    request_body = UpsertReactionRequest,
    responses(
        (status = 200, description = "Reaction created or updated", body = ReactionResponse),
        (status = 400, description = "Invalid emoji"),
        (status = 401, description = "Not authenticated"),
        (status = 404, description = "Post not available"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/posts/{post_id}/reactions")]
pub async fn upsert_reaction(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
    body: web::Json<UpsertReactionRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.reaction_service.clone();
    let post_id = path.into_inner();
    let user_id = user.id;
    let emoji = body.into_inner().emoji;

    let reaction = web::block(move || service.upsert(user_id, post_id, &emoji))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(ReactionResponse::from(reaction)))
}

#[utoipa::path(
    delete,
    path = "/api/v1/posts/{post_id}/reactions",
    tag = "reaction",
    params(("post_id" = Uuid, Path, description = "Post ID")),
    responses(
        (status = 204, description = "Reaction removed"),
        (status = 401, description = "Not authenticated"),
        (status = 404, description = "Reaction not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[delete("/posts/{post_id}/reactions")]
pub async fn remove_reaction(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.reaction_service.clone();
    let post_id = path.into_inner();
    let user_id = user.id;

    web::block(move || service.remove(user_id, post_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}
