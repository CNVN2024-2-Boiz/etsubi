use actix_web::{
    Error, HttpResponse, delete, error::ErrorInternalServerError, get, patch, post, web,
};
use uuid::Uuid;

use crate::{
    bootstrap::state::AppState,
    presentation::dto::{
        auth_dto::AuthUser,
        notification_dto::{
            CreateNotificationRequest, ListNotificationsQuery, MarkAllReadResponse,
            NotificationResponse, NotifyFollowersResponse, UnreadCountResponse,
        },
    },
};

#[utoipa::path(
    post,
    path = "/api/v1/notifications",
    tag = "notification",
    request_body = CreateNotificationRequest,
    responses(
        (status = 201, description = "Notification created", body = NotificationResponse),
        (status = 400, description = "Invalid kind / link / missing context / self-notify"),
        (status = 401, description = "Not authenticated"),
        (status = 403, description = "Requires staff role for this kind"),
        (status = 404, description = "Target user not found"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/notifications")]
pub async fn create_notification(
    state: web::Data<AppState>,
    user: AuthUser,
    body: web::Json<CreateNotificationRequest>,
) -> Result<HttpResponse, Error> {
    let service = state.notification_service.clone();
    let actor_id = user.id;
    let req = body.into_inner();

    let kind = req.kind;
    let target_user_id = req.target_user_id;
    let link = req.link;
    let context = req.context.map(Into::into);

    let created = web::block(move || {
        service.create_by_actor(actor_id, &kind, target_user_id, &link, context)
    })
    .await
    .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Created().json(NotificationResponse::from(created)))
}

#[utoipa::path(
    post,
    path = "/api/v1/posts/{id}/notify-followers",
    tag = "notification",
    params(("id" = Uuid, Path, description = "Post ID")),
    responses(
        (status = 200, description = "Fan-out result", body = NotifyFollowersResponse),
        (status = 401, description = "Not authenticated"),
        (status = 403, description = "Only the post author can trigger fan-out"),
        (status = 404, description = "Post not found or not published"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/posts/{id}/notify-followers")]
pub async fn notify_followers(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.notification_service.clone();
    let post_id = path.into_inner();
    let requester_id = user.id;

    let notified = web::block(move || service.fanout_post_created(post_id, requester_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(NotifyFollowersResponse { notified }))
}

#[utoipa::path(
    get,
    path = "/api/v1/my/notifications",
    tag = "notification",
    params(
        ("limit" = Option<i64>, Query, description = "Max items (default 20, max 100)"),
        ("offset" = Option<i64>, Query, description = "Offset (default 0)"),
    ),
    responses(
        (status = 200, description = "My notifications", body = [NotificationResponse]),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/notifications")]
pub async fn list_my_notifications(
    state: web::Data<AppState>,
    user: AuthUser,
    query: web::Query<ListNotificationsQuery>,
) -> Result<HttpResponse, Error> {
    let service = state.notification_service.clone();
    let user_id = user.id;
    let limit = query.limit;
    let offset = query.offset;

    let list = web::block(move || service.list(user_id, limit, offset))
        .await
        .map_err(ErrorInternalServerError)??;

    let resp: Vec<NotificationResponse> =
        list.into_iter().map(NotificationResponse::from).collect();
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/api/v1/my/notifications/unread-count",
    tag = "notification",
    responses(
        (status = 200, description = "Unread notification count", body = UnreadCountResponse),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[get("/my/notifications/unread-count")]
pub async fn unread_count(
    state: web::Data<AppState>,
    user: AuthUser,
) -> Result<HttpResponse, Error> {
    let service = state.notification_service.clone();
    let user_id = user.id;

    let count = web::block(move || service.unread_count(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(UnreadCountResponse { count }))
}

#[utoipa::path(
    patch,
    path = "/api/v1/my/notifications/{id}/read",
    tag = "notification",
    params(("id" = Uuid, Path, description = "Notification ID")),
    responses(
        (status = 200, description = "Notification marked as read", body = NotificationResponse),
        (status = 404, description = "Notification not found"),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[patch("/my/notifications/{id}/read")]
pub async fn mark_notification_read(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.notification_service.clone();
    let user_id = user.id;
    let notification_id = path.into_inner();

    let updated = web::block(move || service.mark_read(user_id, notification_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(NotificationResponse::from(updated)))
}

#[utoipa::path(
    post,
    path = "/api/v1/my/notifications/read-all",
    tag = "notification",
    responses(
        (status = 200, description = "All notifications marked as read", body = MarkAllReadResponse),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/my/notifications/read-all")]
pub async fn mark_all_read(
    state: web::Data<AppState>,
    user: AuthUser,
) -> Result<HttpResponse, Error> {
    let service = state.notification_service.clone();
    let user_id = user.id;

    let marked = web::block(move || service.mark_all_read(user_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::Ok().json(MarkAllReadResponse {
        marked: marked as i64,
    }))
}

#[utoipa::path(
    delete,
    path = "/api/v1/my/notifications/{id}",
    tag = "notification",
    params(("id" = Uuid, Path, description = "Notification ID")),
    responses(
        (status = 204, description = "Notification deleted"),
        (status = 404, description = "Notification not found"),
        (status = 401, description = "Not authenticated"),
    ),
    security(("bearer_auth" = [])),
)]
#[delete("/my/notifications/{id}")]
pub async fn delete_notification(
    state: web::Data<AppState>,
    user: AuthUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let service = state.notification_service.clone();
    let user_id = user.id;
    let notification_id = path.into_inner();

    web::block(move || service.delete(user_id, notification_id))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}
