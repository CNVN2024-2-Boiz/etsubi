use diesel::Queryable;

#[derive(Queryable)]
#[diesel(table_name = crate::db::schema::posts_tags)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct PostTag {
    pub post_id: i64,
    pub tag_id: i64,
}
