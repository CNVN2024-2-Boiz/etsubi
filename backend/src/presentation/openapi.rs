use utoipa::{
    Modify, OpenApi,
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
};

use crate::presentation::{
    dto::{
        auth_dto::{LoginRequest, LoginResponse, RegisterRequest, RegisterResponse},
        post_dto::{CreatePostRequest, PostResponse, UpdatePostRequest, UpdatePostStatusRequest},
        user_dto::{UpdateProfileRequest, UpdateRoleRequest, UpdateStatusRequest, UserResponse},
    },
    handlers::{auth_handler, post_handler, user_handler},
};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Etsubi API",
        version = "1.0.0",
        description = "Backend API for the Etsubi platform"
    ),
    paths(
        auth_handler::register,
        auth_handler::login,
        user_handler::get_personal_info,
        user_handler::get_user,
        user_handler::update_user,
        user_handler::update_status,
        user_handler::update_role,
        post_handler::create_post,
        post_handler::get_post,
        post_handler::get_my_post,
        post_handler::list_my_posts,
        post_handler::list_user_posts,
        post_handler::update_post,
        post_handler::update_post_status,
        post_handler::delete_post,
    ),
    components(schemas(
        RegisterRequest, RegisterResponse,
        LoginRequest, LoginResponse,
        UserResponse,
        UpdateProfileRequest, UpdateStatusRequest, UpdateRoleRequest,
        PostResponse,
        CreatePostRequest, UpdatePostRequest, UpdatePostStatusRequest,
    )),
    tags(
        (name = "system", description = "System endpoints"),
        (name = "auth", description = "Authentication"),
        (name = "user", description = "User management"),
        (name = "post", description = "Post management"),
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
