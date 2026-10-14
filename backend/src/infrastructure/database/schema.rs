// @generated automatically by Diesel CLI.

diesel::table! {
    bookmarks (user_id, post_id) {
        user_id -> Uuid,
        post_id -> Uuid,
        bookmarked_at -> Timestamptz,
    }
}

diesel::table! {
    comments (id) {
        id -> Uuid,
        parent_id -> Nullable<Uuid>,
        post_id -> Uuid,
        user_id -> Uuid,
        content -> Text,
        status -> Text,
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
        content -> Nullable<Text>,
        view_count -> Int4,
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
    reports (id) {
        id -> Uuid,
        reporter_id -> Uuid,
        post_id -> Nullable<Uuid>,
        comment_id -> Nullable<Uuid>,
        reason -> Text,
        detail -> Nullable<Text>,
        status -> Text,
        created_at -> Timestamptz,
        resolved_at -> Nullable<Timestamptz>,
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
        password -> Text,
        avatar_url -> Nullable<Text>,
        bio -> Nullable<Text>,
        role -> Text,
        status -> Text,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        muted_until -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    users_blocks (blocker_id, blocked_id) {
        blocker_id -> Uuid,
        blocked_id -> Uuid,
        blocked_at -> Timestamptz,
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
diesel::joinable!(comments -> posts (post_id));
diesel::joinable!(comments -> users (user_id));
diesel::joinable!(posts -> users (author_id));
diesel::joinable!(posts_tags -> posts (post_id));
diesel::joinable!(posts_tags -> tags (tag_id));
diesel::joinable!(reactions -> posts (post_id));
diesel::joinable!(reactions -> users (user_id));
diesel::joinable!(reports -> comments (comment_id));
diesel::joinable!(reports -> posts (post_id));
diesel::joinable!(reports -> users (reporter_id));

diesel::allow_tables_to_appear_in_same_query!(
    bookmarks,
    comments,
    posts,
    posts_tags,
    reactions,
    reports,
    tags,
    users,
    users_blocks,
    users_follows,
);
