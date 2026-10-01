// @generated automatically by Diesel CLI.

diesel::table! {
    bookmarks (user_id, post_id) {
        user_id -> Int8,
        post_id -> Int8,
        bookmarked_at -> Timestamptz,
    }
}

diesel::table! {
    comments (id) {
        id -> Int8,
        parent_id -> Nullable<Int8>,
        post_id -> Int8,
        user_id -> Int8,
        content -> Text,
        status -> Text,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    posts (id) {
        id -> Int8,
        author_id -> Int8,
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
        post_id -> Int8,
        tag_id -> Int8,
    }
}

diesel::table! {
    reactions (user_id, post_id) {
        user_id -> Int8,
        post_id -> Int8,
        emoji -> Text,
        reacted_at -> Timestamptz,
    }
}

diesel::table! {
    reports (id) {
        id -> Int8,
        reporter_id -> Int8,
        post_id -> Nullable<Int8>,
        comment_id -> Nullable<Int8>,
        reason -> Text,
        detail -> Nullable<Text>,
        status -> Text,
        created_at -> Timestamptz,
        resolved_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    roles (id) {
        id -> Int8,
        name -> Text,
        description -> Nullable<Text>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    tags (id) {
        id -> Int8,
        name -> Text,
        description -> Nullable<Text>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    users (id) {
        id -> Int8,
        username -> Text,
        email -> Text,
        password -> Text,
        avatar_url -> Nullable<Text>,
        bio -> Nullable<Text>,
        status -> Text,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        muted_until -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    users_blocks (blocker_id, blocked_id) {
        blocker_id -> Int8,
        blocked_id -> Int8,
        blocked_at -> Timestamptz,
    }
}

diesel::table! {
    users_follows (follower_id, following_id) {
        follower_id -> Int8,
        following_id -> Int8,
        followed_at -> Timestamptz,
    }
}

diesel::table! {
    users_roles (user_id, role_id) {
        user_id -> Int8,
        role_id -> Int8,
        assigned_at -> Timestamptz,
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
diesel::joinable!(users_roles -> roles (role_id));
diesel::joinable!(users_roles -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(
    bookmarks,
    comments,
    posts,
    posts_tags,
    reactions,
    reports,
    roles,
    tags,
    users,
    users_blocks,
    users_follows,
    users_roles,
);
