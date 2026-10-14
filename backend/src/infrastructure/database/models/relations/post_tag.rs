use crate::infrastructure::database::schema::posts_tags;
use diesel::{Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Debug, Queryable, Selectable)]
#[diesel(table_name = posts_tags)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct PostTag {
    pub post_id: Uuid,
    pub tag_id: Uuid,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = posts_tags)]
pub struct NewPostTag {
    pub post_id: Uuid,
    pub tag_id: Uuid,
}
