use utoipa::{
    Modify, OpenApi,
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
};

use crate::presentation::{
    dto::{
        auth_dto::{LoginRequest, LoginResponse, RegisterRequest, RegisterResponse},
        bookmark_dto::{BookmarkResponse, BookmarkStatusResponse},
        comment_dto::{
            CommentResponse, CreateCommentRequest, UpdateCommentRequest, UpdateCommentStatusRequest,
        },
        follow_dto::{FollowStatsResponse, FollowStatusResponse, FollowUserResponse},
        language_dto::LanguageResponse,
        post_dto::{CreatePostRequest, PostResponse, UpdatePostRequest, UpdatePostStatusRequest},
        tag_dto::TagResponse,
        user_dto::{
            ChangePasswordRequest, DeleteAccountRequest, GetUserResponse, UpdateProfileRequest,
            UpdateRoleRequest, UpdateStatusRequest,
        },
    },
    handlers::{
        auth_handler, bookmark_handler, comment_handler, follow_handler, language_handler,
        manage_handler, personal_handler, post_handler, tag_handler, user_handler,
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
        auth_handler::register,
        auth_handler::login,

        personal_handler::get_my_profile,
        personal_handler::update_my_profile,
        personal_handler::change_my_password,
        personal_handler::delete_my_account,

        personal_handler::list_my_posts,
        personal_handler::get_my_post,
        personal_handler::list_my_deleted_posts,
        personal_handler::list_my_comments,
        personal_handler::get_my_comment,

        personal_handler::list_my_bookmarks,
        personal_handler::check_my_bookmark,

        personal_handler::list_my_followers,
        personal_handler::list_my_following,
        personal_handler::check_my_following,
        personal_handler::get_my_follow_stats,

        personal_handler::list_my_languages,
        personal_handler::add_my_language,
        personal_handler::remove_my_language,

        user_handler::get_user,
        user_handler::update_user,

        post_handler::create_post,
        post_handler::get_post,
        post_handler::list_user_posts,
        post_handler::update_post,
        post_handler::delete_post,

        comment_handler::list_post_comments,
        comment_handler::get_comment,
        comment_handler::create_comment,
        comment_handler::update_comment,
        comment_handler::delete_comment,

        bookmark_handler::add_bookmark,
        bookmark_handler::remove_bookmark,

        follow_handler::follow_user,
        follow_handler::unfollow_user,
        follow_handler::list_user_followers,
        follow_handler::list_user_following,
        follow_handler::get_follow_stats,

        language_handler::list_languages,
        language_handler::list_user_languages,

        manage_handler::update_user_status,
        manage_handler::update_user_role,
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
        ChangePasswordRequest, DeleteAccountRequest,

        PostResponse,
        CreatePostRequest, UpdatePostRequest, UpdatePostStatusRequest,

        CommentResponse,
        CreateCommentRequest, UpdateCommentRequest, UpdateCommentStatusRequest,

        TagResponse,

        BookmarkResponse, BookmarkStatusResponse,

        FollowUserResponse, FollowStatsResponse, FollowStatusResponse,

        LanguageResponse,
    )),
    tags(
        (name = "system",    description = "System endpoints"),
        (name = "auth",      description = "Authentication"),
        (name = "personal",  description = "Self-service endpoints (/my/*)"),
        (name = "user",      description = "User management"),
        (name = "post",      description = "Post management"),
        (name = "comment",   description = "Comment management"),
        (name = "bookmark",  description = "Bookmarks"),
        (name = "follow",    description = "Follow relationships"),
        (name = "language",  description = "Languages"),
        (name = "manage",    description = "Moderation endpoints"),
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
