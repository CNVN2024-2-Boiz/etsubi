use crate::infrastructure::database::schema::posts_tags;
use diesel::{Insertable, Queryable, Selectable};

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = posts_tags)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct PostTag {
    pub post_id: i64,
    pub tag_id: i64,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = posts_tags)]
pub struct NewPostTag {
    pub post_id: i64,
    pub tag_id: i64,
}
