use actix_web::{
    Error, HttpResponse, delete, error::ErrorInternalServerError, get, patch, post, web,
};

use uuid::Uuid;

use crate::bootstrap::state::AppState;
use crate::presentation::dto::{
    auth_dto::CurrentUser,
    bookmark_dto::BookmarkStatusResponse,
    comment_dto::CommentResponse,
    follow_dto::{FollowStatsResponse, FollowStatusResponse, FollowUserResponse},
    language_dto::LanguageResponse,
    post_dto::PostResponse,
    user_dto::{
        ChangePasswordRequest, DeleteAccountRequest, GetUserResponse, UpdateProfileRequest,
    },
};

#[utoipa::path(
    get, path = "/api/v1/my", tag = "personal",
    responses(
        (status = 200, description = "Current user profile", body = GetUserResponse),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my")]
pub async fn get_my_profile(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let me = web::block(move || service.get(user.id))
        .await
        .map_err(ErrorInternalServerError)??;
    Ok(HttpResponse::Ok().json(GetUserResponse::from(me)))
}

#[utoipa::path(
    patch, path = "/api/v1/my", tag = "personal",
    request_body = UpdateProfileRequest,
    responses(
        (status = 200, description = "Profile updated", body = GetUserResponse),
        (status = 400, description = "Invalid payload"),
        (status = 401, description = "Not authenticated"),
        (status = 409, description = "Email or username already taken"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/my")]
pub async fn update_my_profile(
    state: web::Data<AppState>,
    user: CurrentUser,
    body: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.user_service.clone();
    let requester_id = user.id;
    let req = body.into_inner();

    let updated = web::block(move || {
        service.update_profile(
            requester_id,
            requester_id,
            req.username,
            req.email,
            req.school,
            req.address,
            req.bio,
            req.avatar_url,
        )
    })
    .await
    .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(GetUserResponse::from(updated)))
}

#[utoipa::path(
    patch, path = "/api/v1/my/password", tag = "personal",
    request_body = ChangePasswordRequest,
    responses(
        (status = 204, description = "Password changed"),
        (status = 400, description = "Weak password"),
        (status = 401, description = "Wrong current password"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/my/password")]
pub async fn change_my_password(
    state: web::Data<AppState>,
    user: CurrentUser,
    body: web::Json<ChangePasswordRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.auth_service.clone();
    let user_id = user.id;
    let req = body.into_inner();

    web::block(move || service.change_password(user_id, &req.current_password, &req.new_password))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}

#[utoipa::path(
    delete, path = "/api/v1/my", tag = "personal",
    request_body = DeleteAccountRequest,
    responses(
        (status = 204, description = "Account deleted"),
        (status = 401, description = "Wrong password"),
        (status = 400, description = "Admin cannot self-delete"),
    ),
    security(("bearer_auth" = [])),
)]
#[delete("/my")]
pub async fn delete_my_account(
    state: web::Data<AppState>,
    user: CurrentUser,
    body: web::Json<DeleteAccountRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.auth_service.clone();
    let user_id = user.id;
    let password = body.into_inner().password;

    web::block(move || service.delete_account(user_id, &password))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}

#[utoipa::path(
    get, path = "/api/v1/my/posts", tag = "personal",
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
    get, path = "/api/v1/my/posts/{id}", tag = "personal",
    params(("id" = Uuid, Path, description = "Post ID")),
    responses(
        (status = 200, description = "My post (published or hidden)", body = PostResponse),
        (status = 404, description = "Post not found or not owned by me"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/posts/{id}")]
pub async fn get_my_post(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let post_id = path.into_inner();
    let owner_id = user.id;

    let post = web::block(move || service.get_owned(post_id, owner_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(PostResponse::from(post)))
}

#[utoipa::path(
    get, path = "/api/v1/my/deleted-posts", tag = "personal",
    responses(
        (status = 200, description = "My soft-deleted posts", body = [PostResponse]),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/deleted-posts")]
pub async fn list_my_deleted_posts(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.post_service.clone();
    let author_id = user.id;

    let posts = web::block(move || service.list_deleted(author_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<PostResponse> = posts.into_iter().map(PostResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get, path = "/api/v1/my/comments", tag = "personal",
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

#[utoipa::path(
    get, path = "/api/v1/my/comments/{id}", tag = "personal",
    params(("id" = Uuid, Path, description = "Comment ID")),
    responses(
        (status = 200, description = "My comment (including hidden/deleted placeholder)", body = CommentResponse),
        (status = 404, description = "Comment not found or not owned by me"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/comments/{id}")]
pub async fn get_my_comment(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.comment_service.clone();
    let comment_id = path.into_inner();
    let owner_id = user.id;

    let comment = web::block(move || service.get_owned(comment_id, owner_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(CommentResponse::from(comment)))
}

#[utoipa::path(
    get, path = "/api/v1/my/bookmarks", tag = "personal",
    responses(
        (status = 200, description = "My bookmarked posts", body = [PostResponse]),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/bookmarks")]
pub async fn list_my_bookmarks(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.bookmark_service.clone();
    let user_id = user.id;

    let posts = web::block(move || service.list_my(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<PostResponse> = posts.into_iter().map(PostResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get, path = "/api/v1/my/bookmarks/{post_id}", tag = "personal",
    params(("post_id" = Uuid, Path, description = "Post ID")),
    responses(
        (status = 200, description = "Bookmark status", body = BookmarkStatusResponse),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/bookmarks/{post_id}")]
pub async fn check_my_bookmark(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.bookmark_service.clone();
    let user_id = user.id;
    let post_id = path.into_inner();

    let bookmarked = web::block(move || service.is_bookmarked(user_id, post_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(BookmarkStatusResponse { bookmarked }))
}

#[utoipa::path(
    get, path = "/api/v1/my/followers", tag = "personal",
    responses(
        (status = 200, description = "My followers", body = [FollowUserResponse]),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/followers")]
pub async fn list_my_followers(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.follow_service.clone();
    let user_id = user.id;

    let users = web::block(move || service.list_followers(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<FollowUserResponse> = users.into_iter().map(FollowUserResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get, path = "/api/v1/my/following", tag = "personal",
    responses(
        (status = 200, description = "Users I am following", body = [FollowUserResponse]),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/following")]
pub async fn list_my_following(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.follow_service.clone();
    let user_id = user.id;

    let users = web::block(move || service.list_following(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<FollowUserResponse> = users.into_iter().map(FollowUserResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get, path = "/api/v1/my/following/{user_id}", tag = "personal",
    params(("user_id" = Uuid, Path, description = "User ID to check")),
    responses(
        (status = 200, description = "Follow status", body = FollowStatusResponse),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/following/{user_id}")]
pub async fn check_my_following(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.follow_service.clone();
    let follower_id = user.id;
    let following_id = path.into_inner();

    let following = web::block(move || service.is_following(follower_id, following_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(FollowStatusResponse { following }))
}

#[utoipa::path(
    get, path = "/api/v1/my/follow-stats", tag = "personal",
    responses(
        (status = 200, description = "My follower/following counts", body = FollowStatsResponse),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/follow-stats")]
pub async fn get_my_follow_stats(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.follow_service.clone();
    let user_id = user.id;

    let (followers, following) = web::block(move || service.stats(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(FollowStatsResponse {
        followers,
        following,
    }))
}

#[utoipa::path(
    get, path = "/api/v1/my/languages", tag = "personal",
    responses(
        (status = 200, description = "Languages I speak", body = [LanguageResponse]),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/languages")]
pub async fn list_my_languages(
    state: web::Data<AppState>,
    user: CurrentUser,
) -> Result<HttpResponse, Error> {
    let service = state.language_service.clone();
    let user_id = user.id;

    let languages = web::block(move || service.list_by_user(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<LanguageResponse> = languages.into_iter().map(LanguageResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    post, path = "/api/v1/my/languages/{language_id}", tag = "personal",
    params(("language_id" = Uuid, Path, description = "Language ID")),
    responses(
        (status = 204, description = "Language added"),
        (status = 404, description = "Language not found"),
        (status = 409, description = "Already added"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/my/languages/{language_id}")]
pub async fn add_my_language(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.language_service.clone();
    let user_id = user.id;
    let language_id = path.into_inner();

    web::block(move || service.add(user_id, language_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}

#[utoipa::path(
    delete, path = "/api/v1/my/languages/{language_id}", tag = "personal",
    params(("language_id" = Uuid, Path, description = "Language ID")),
    responses(
        (status = 204, description = "Language removed"),
        (status = 409, description = "Not added"),
    ),
    security(("bearer_auth" = [])),
)]
#[delete("/my/languages/{language_id}")]
pub async fn remove_my_language(
    state: web::Data<AppState>,
    user: CurrentUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.language_service.clone();
    let user_id = user.id;
    let language_id = path.into_inner();

    web::block(move || service.remove(user_id, language_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}
