use utoipa::{
    Modify, OpenApi,
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
};

use crate::presentation::{
    dto::{
        auth_dto::{LoginRequest, LoginResponse, RegisterRequest, RegisterResponse},
        comment_dto::{
            CommentResponse, CreateCommentRequest, UpdateCommentRequest, UpdateCommentStatusRequest,
        },
        post_dto::{CreatePostRequest, PostResponse, UpdatePostRequest, UpdatePostStatusRequest},
        tag_dto::TagResponse,
        user_dto::{UpdateProfileRequest, UpdateRoleRequest, UpdateStatusRequest, UserResponse},
    },
    handlers::{
        auth_handler, comment_handler, manage_handler, personal_handler, post_handler, tag_handler,
        user_handler,
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
        personal_handler::list_my_posts,
        personal_handler::list_my_comments,

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

        UserResponse,
        UpdateProfileRequest, UpdateStatusRequest, UpdateRoleRequest,

        PostResponse,
        CreatePostRequest, UpdatePostRequest, UpdatePostStatusRequest,

        CommentResponse,
        CreateCommentRequest, UpdateCommentRequest, UpdateCommentStatusRequest,

        TagResponse
    )),
    tags(
        (name = "system", description = "System endpoints"),
        (name = "auth", description = "Authentication"),
        (name = "personal", description = "Self-service endpoints"),
        (name = "user", description = "User management"),
        (name = "post", description = "Post management"),
        (name = "comment", description = "Comment management"),
        (name = "manage", description = "Moderation endpoints"),
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
