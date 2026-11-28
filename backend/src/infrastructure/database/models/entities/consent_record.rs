use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};
use uuid::Uuid;

use crate::infrastructure::database::schema::consent_records;

/// Một lần người dùng đồng ý một mục đích (điều khoản hoặc xử lý dữ liệu cá nhân).
#[derive(Debug, Clone, Queryable, Selectable)]
#[diesel(table_name = consent_records)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct ConsentRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub purpose: String,
    pub document_version: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub granted_at: DateTime<Utc>,
}

/// Dữ liệu ghi một bản đồng ý mới; `user_id` được điền khi tạo tài khoản trong cùng transaction.
#[derive(Debug, Clone)]
pub struct NewConsent {
    pub purpose: String,
    pub document_version: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = consent_records)]
pub struct NewConsentRow<'a> {
    pub user_id: Uuid,
    pub purpose: &'a str,
    pub document_version: &'a str,
    pub ip_address: Option<&'a str>,
    pub user_agent: Option<&'a str>,
}
