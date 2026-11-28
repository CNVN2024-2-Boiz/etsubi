use actix_web::{Error, HttpResponse, error::ErrorInternalServerError, post, web};

use crate::{
    bootstrap::state::AppState,
    domains::report::service::ReportInput,
    presentation::dto::{auth_dto::AuthUser, report_dto::CreateReportRequest},
};

/// Gửi báo cáo vi phạm: kiểm tra rồi gửi mail về hộp thư kiểm duyệt (`REPORT_EMAIL`).
#[utoipa::path(
    post,
    path = "/api/v1/reports",
    tag = "report",
    request_body = CreateReportRequest,
    responses(
        (status = 204, description = "Report emailed to the moderation inbox"),
        (status = 400, description = "invalid_target / invalid_reason / details_required / details_too_long / cannot_report_self"),
        (status = 401, description = "Not signed in"),
        (status = 404, description = "target_not_found"),
        (status = 409, description = "report_cooldown (same target within 10 minutes) / report_limit (10 per hour)"),
    ),
    security(("bearer_auth" = [])),
)]
#[post("/reports")]
pub async fn create_report(
    state: web::Data<AppState>,
    user: AuthUser,
    body: web::Json<CreateReportRequest>,
) -> Result<HttpResponse, Error> {
    let body = body.into_inner();
    let input = ReportInput {
        target_type: body.target_type,
        target_id: body.target_id,
        reasons: body.reasons,
        details: body.details,
    };
    let reporter_id = user.id;
    let service = state.report_service.clone();

    web::block(move || service.submit(reporter_id, input))
        .await
        .map_err(ErrorInternalServerError)??;

    Ok(HttpResponse::NoContent().finish())
}
