use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, get, web};

use crate::{
    bootstrap::state::AppState,
    presentation::dto::{
        auth_dto::CurrentUser, comment_dto::CommentResponse, post_dto::PostResponse,
        user_dto::GetUserResponse,
    },
};

#[utoipa::path(
    get,
    path = "/api/v1/my",
    tag = "personal",
    responses(
        (status = 200, description = "Current user profile", body = GetUserResponse),
        (status = 401, description = "Not authenticated"),
        (status = 404, description = "User not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my")]
pub async fn get_my_profile(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let user_id = user.id;

    let me = web::block(move || service.get(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(GetUserResponse::from(me)))
}

#[utoipa::path(
    get,
    path = "/api/v1/my/posts",
    tag = "personal",
    responses(
        (status = 200, description = "List of own posts", body = [PostResponse]),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/posts")]
pub async fn list_my_posts(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let author_id = user.id;

    let posts = web::block(move || service.list_my_posts(author_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<PostResponse> = posts.into_iter().map(PostResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/api/v1/my/comments",
    tag = "personal",
    responses(
        (status = 200, description = "List of own comments", body = [CommentResponse]),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/comments")]
pub async fn list_my_comments(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.comment_service.clone();
    let author_id = user.id;

    let comments = web::block(move || service.list_my_comments(author_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<CommentResponse> = comments.into_iter().map(CommentResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

// pub async fn my_follower();
// pub async fn my_following_list();
