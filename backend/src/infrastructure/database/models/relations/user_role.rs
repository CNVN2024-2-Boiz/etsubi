use crate::infrastructure::database::schema::users_roles;
use chrono::{DateTime, Utc};
use diesel::{Insertable, Queryable, Selectable};

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = users_roles)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct UserRole {
    pub user_id: i64,
    pub role_id: i64,
    pub assigned_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = users_roles)]
pub struct NewUserRole {
    pub user_id: i64,
    pub role_id: i64,
}
