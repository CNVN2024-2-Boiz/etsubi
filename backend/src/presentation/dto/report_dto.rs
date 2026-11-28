use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;

/// Báo cáo vi phạm gửi từ front end. Người báo cáo lấy từ JWT, không nằm trong body.
#[derive(Deserialize, ToSchema)]
pub struct CreateReportRequest {
    /// `post`, `comment` hoặc `user`.
    #[schema(example = "post")]
    pub target_type: String,
    pub target_id: Uuid,
    /// Mã lý do theo loại đối tượng, ví dụ `spam`, `hate`, `other`.
    #[schema(example = json!(["hate", "other"]))]
    pub reasons: Vec<String>,
    /// Mô tả thêm (bắt buộc khi có `other`, tối đa 1000 ký tự).
    pub details: Option<String>,
}
