use utoipa::{
    Modify, OpenApi,
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
};

use crate::presentation::{
    dto::{
        auth_dto::{LoginRequest, LoginResponse, RegisterRequest, RegisterResponse},
        bookmark_dto::{BookmarkResponse, BookmarkStatusResponse},
        comment_dto::{
            CommentResponse, CreateCommentRequest, LockCommentsRequest, UpdateCommentRequest,
            UpdateCommentStatusRequest,
        },
        follow_dto::{FollowStatusResponse, FollowUserResponse, FollowerStatusResponse},
        post_dto::{
            CreatePostRequest, PostResponse, SearchPostsQuery, UpdatePostRequest,
            UpdatePostStatusRequest,
        },
        reaction_dto::{ReactionResponse, ReactionSummaryItem, UpsertReactionRequest},
        tag_dto::TagResponse,
        translation_dto::{CommentTranslationResponse, PostTranslationResponse},
        user_dto::{
            ChangePasswordRequest, DeleteAccountRequest, GetUserResponse, MuteUserRequest,
            UpdateProfileRequest, UpdateRoleRequest, UpdateStatusRequest,
        },
    },
    handlers::{
        auth_handler, bookmark_handler, comment_handler, follow_handler, health_handler,
        manage_handler, personal_handler, post_handler, reaction_handler, tag_handler,
        translation_handler, user_handler,
    },
};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Etsubi API",
        version = "1.0.0",
        description = "Backend API for the Etsubi"
    ),
    paths(
        health_handler::health,

        auth_handler::register,
        auth_handler::login,
        auth_handler::logout,

        personal_handler::get_my_profile,
        personal_handler::update_my_profile,
        personal_handler::change_my_password,
        personal_handler::delete_my_account,

        personal_handler::list_my_posts,
        personal_handler::get_my_post,
        personal_handler::list_my_comments,
        personal_handler::get_my_comment,

        personal_handler::list_my_bookmarks,
        personal_handler::check_my_bookmark,

        personal_handler::list_my_followers,
        personal_handler::list_my_following,
        personal_handler::check_my_following,
        personal_handler::check_my_follower,

        translation_handler::translate_post,
        translation_handler::translate_comment,

        user_handler::get_user,
        user_handler::update_user,

        post_handler::create_post,
        post_handler::get_post,
        post_handler::list_user_posts,
        post_handler::update_post,
        post_handler::delete_post,
        post_handler::search_posts,

        comment_handler::list_post_comments,
        comment_handler::get_comment,
        comment_handler::create_comment,
        comment_handler::update_comment,
        comment_handler::delete_comment,
        comment_handler::lock_post_comments,

        bookmark_handler::add_bookmark,
        bookmark_handler::remove_bookmark,

        follow_handler::follow_user,
        follow_handler::unfollow_user,
        follow_handler::list_user_followers,
        follow_handler::list_user_following,

        reaction_handler::list_post_reactions,
        reaction_handler::summary_post_reactions,
        reaction_handler::get_my_reaction,
        reaction_handler::upsert_reaction,
        reaction_handler::remove_reaction,

        manage_handler::update_user_status,
        manage_handler::update_user_role,
        manage_handler::mute_user,
        manage_handler::update_post_status,
        manage_handler::restore_post,
        manage_handler::list_post_comments_manage,
        manage_handler::get_comment_manage,
        manage_handler::update_comment_status,
        manage_handler::restore_comment,

        tag_handler::list_tags,
        tag_handler::get_tag,
        tag_handler::list_tag_posts,
        tag_handler::list_post_tags,
        tag_handler::attach_tag,
        tag_handler::detach_tag,
    ),
    components(schemas(
        RegisterRequest, RegisterResponse,
        LoginRequest, LoginResponse,

        GetUserResponse,
        UpdateProfileRequest, UpdateStatusRequest, UpdateRoleRequest,
        MuteUserRequest,
        ChangePasswordRequest, DeleteAccountRequest,

        PostResponse,
        CreatePostRequest, UpdatePostRequest, UpdatePostStatusRequest, SearchPostsQuery,

        CommentResponse,
        CreateCommentRequest, UpdateCommentRequest, UpdateCommentStatusRequest,
        LockCommentsRequest,

        TagResponse,

        BookmarkResponse, BookmarkStatusResponse,

        FollowUserResponse, FollowStatusResponse, FollowerStatusResponse,

        ReactionResponse, ReactionSummaryItem, UpsertReactionRequest,

        PostTranslationResponse, CommentTranslationResponse,
    )),
    tags(
        (name = "system",      description = "System endpoints"),
        (name = "auth",        description = "Authentication"),
        (name = "personal",    description = "Self-service endpoints (/my/*)"),
        (name = "user",        description = "User management"),
        (name = "post",        description = "Post management"),
        (name = "comment",     description = "Comment management"),
        (name = "bookmark",    description = "Bookmarks"),
        (name = "follow",      description = "Follow relationships"),
        (name = "reaction",    description = "Post reactions (emoji)"),
        (name = "manage",      description = "Moderation endpoints"),
        (name = "translation", description = "Automatic translation (DeepSeek)"),
    ),
    modifiers(&SecurityAddon),
)]
pub struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                SecurityScheme::Http(
                    HttpBuilder::new()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .build(),
                ),
            );
        }
    }
}
