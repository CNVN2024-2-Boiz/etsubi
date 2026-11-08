// @generated automatically by Diesel CLI.

diesel::table! {
    bookmarks (user_id, post_id) {
        user_id -> Uuid,
        post_id -> Uuid,
        bookmarked_at -> Timestamptz,
    }
}

diesel::table! {
    comment_translation (original_comment_id, language) {
        original_comment_id -> Uuid,
        language -> Text,
        content -> Text,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        deleted_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    comments (id) {
        id -> Uuid,
        parent_id -> Nullable<Uuid>,
        post_id -> Uuid,
        user_id -> Uuid,
        content -> Text,
        language -> Text,
        status -> Text,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        deleted_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    post_translation (original_post_id, language) {
        original_post_id -> Uuid,
        language -> Text,
        title -> Text,
        content -> Text,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        deleted_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    posts (id) {
        id -> Uuid,
        author_id -> Uuid,
        title -> Text,
        content -> Text,
        language -> Text,
        latitude -> Nullable<Float8>,
        longitude -> Nullable<Float8>,
        status -> Text,
        comments_locked -> Bool,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        deleted_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    posts_tags (post_id, tag_id) {
        post_id -> Uuid,
        tag_id -> Uuid,
    }
}

diesel::table! {
    reactions (user_id, post_id) {
        user_id -> Uuid,
        post_id -> Uuid,
        emoji -> Text,
        reacted_at -> Timestamptz,
    }
}

diesel::table! {
    tags (id) {
        id -> Uuid,
        name -> Text,
        description -> Nullable<Text>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    users (id) {
        id -> Uuid,
        username -> Text,
        email -> Text,
        school -> Nullable<Text>,
        address -> Nullable<Text>,
        native -> Text,
        language -> Text,
        password -> Text,
        avatar_url -> Nullable<Text>,
        bio -> Nullable<Text>,
        role -> Text,
        status -> Text,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        muted_until -> Nullable<Timestamptz>,
        token_version -> Int4,
    }
}

diesel::table! {
    users_follows (follower_id, following_id) {
        follower_id -> Uuid,
        following_id -> Uuid,
        followed_at -> Timestamptz,
    }
}

diesel::joinable!(bookmarks -> posts (post_id));
diesel::joinable!(bookmarks -> users (user_id));
diesel::joinable!(comment_translation -> comments (original_comment_id));
diesel::joinable!(comments -> posts (post_id));
diesel::joinable!(comments -> users (user_id));
diesel::joinable!(post_translation -> posts (original_post_id));
diesel::joinable!(posts -> users (author_id));
diesel::joinable!(posts_tags -> posts (post_id));
diesel::joinable!(posts_tags -> tags (tag_id));
diesel::joinable!(reactions -> posts (post_id));
diesel::joinable!(reactions -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(
    bookmarks,
    comment_translation,
    comments,
    post_translation,
    posts,
    posts_tags,
    reactions,
    tags,
    users,
    users_follows,
);
