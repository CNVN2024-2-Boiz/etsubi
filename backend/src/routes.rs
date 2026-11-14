use crate::infrastructure::middleware::auth;
use crate::presentation;
use actix_web::{middleware, web};

pub fn public(cfg: &mut web::ServiceConfig) {
    cfg.service(presentation::handlers::health_handler::health);
    cfg.service(presentation::handlers::auth_handler::register);
    cfg.service(presentation::handlers::auth_handler::login);

    cfg.service(presentation::handlers::user_handler::get_user);

    cfg.service(presentation::handlers::post_handler::list_newest_posts);
    cfg.service(presentation::handlers::post_handler::list_popular_posts);
    cfg.service(presentation::handlers::post_handler::list_question_and_answer_posts);
    cfg.service(presentation::handlers::post_handler::search_posts);
    cfg.service(presentation::handlers::post_handler::get_post);
    cfg.service(presentation::handlers::post_handler::list_user_posts);

    cfg.service(presentation::handlers::comment_handler::list_post_comments);
    cfg.service(presentation::handlers::comment_handler::get_comment);

    cfg.service(presentation::handlers::tag_handler::list_tags);
    cfg.service(presentation::handlers::tag_handler::get_tag);
    cfg.service(presentation::handlers::tag_handler::list_tag_posts);
    cfg.service(presentation::handlers::tag_handler::list_post_tags);

    cfg.service(presentation::handlers::follow_handler::list_user_followers);
    cfg.service(presentation::handlers::follow_handler::list_user_following);

    cfg.service(presentation::handlers::reaction_handler::list_post_reactions);
    cfg.service(presentation::handlers::reaction_handler::summary_post_reactions);
}

pub fn protected(cfg: &mut web::ServiceConfig) {
    cfg.service(presentation::handlers::auth_handler::logout);

    cfg.service(presentation::handlers::personal_handler::get_my_profile);
    cfg.service(presentation::handlers::personal_handler::update_my_profile);
    cfg.service(presentation::handlers::personal_handler::change_my_password);
    cfg.service(presentation::handlers::personal_handler::delete_my_account);

    cfg.service(presentation::handlers::personal_handler::list_my_posts);
    cfg.service(presentation::handlers::personal_handler::get_my_post);
    cfg.service(presentation::handlers::personal_handler::list_my_comments);
    cfg.service(presentation::handlers::personal_handler::get_my_comment);

    cfg.service(presentation::handlers::personal_handler::list_my_bookmarks);
    cfg.service(presentation::handlers::personal_handler::check_my_bookmark);

    cfg.service(presentation::handlers::personal_handler::list_my_followers);
    cfg.service(presentation::handlers::personal_handler::list_my_following);
    cfg.service(presentation::handlers::personal_handler::check_my_following);
    cfg.service(presentation::handlers::personal_handler::check_my_follower);

    cfg.service(presentation::handlers::user_handler::update_user);

    cfg.service(presentation::handlers::post_handler::create_post);
    cfg.service(presentation::handlers::post_handler::update_post);
    cfg.service(presentation::handlers::post_handler::delete_post);
    cfg.service(presentation::handlers::post_handler::list_following_user_posts);

    cfg.service(presentation::handlers::comment_handler::create_comment);
    cfg.service(presentation::handlers::comment_handler::update_comment);
    cfg.service(presentation::handlers::comment_handler::delete_comment);
    cfg.service(presentation::handlers::comment_handler::lock_post_comments);

    cfg.service(presentation::handlers::tag_handler::attach_tag);
    cfg.service(presentation::handlers::tag_handler::detach_tag);

    cfg.service(presentation::handlers::bookmark_handler::add_bookmark);
    cfg.service(presentation::handlers::bookmark_handler::remove_bookmark);

    cfg.service(presentation::handlers::reaction_handler::upsert_reaction);
    cfg.service(presentation::handlers::reaction_handler::remove_reaction);
    cfg.service(presentation::handlers::reaction_handler::get_my_reaction);

    cfg.service(presentation::handlers::follow_handler::follow_user);
    cfg.service(presentation::handlers::follow_handler::unfollow_user);

    cfg.service(presentation::handlers::manage_handler::update_user_status);
    cfg.service(presentation::handlers::manage_handler::update_user_role);
    cfg.service(presentation::handlers::manage_handler::mute_user);
    cfg.service(presentation::handlers::manage_handler::update_post_status);
    cfg.service(presentation::handlers::manage_handler::restore_post);
    cfg.service(presentation::handlers::manage_handler::list_post_comments_manage);
    cfg.service(presentation::handlers::manage_handler::get_comment_manage);
    cfg.service(presentation::handlers::manage_handler::update_comment_status);
    cfg.service(presentation::handlers::manage_handler::restore_comment);

    cfg.service(presentation::handlers::notification_handler::create_notification);
    cfg.service(presentation::handlers::notification_handler::notify_followers);
    cfg.service(presentation::handlers::notification_handler::list_my_notifications);
    cfg.service(presentation::handlers::notification_handler::unread_count);
    cfg.service(presentation::handlers::notification_handler::mark_notification_read);
    cfg.service(presentation::handlers::notification_handler::mark_all_read);
    cfg.service(presentation::handlers::notification_handler::delete_notification);

    cfg.service(presentation::handlers::translation_handler::translate_post);
    cfg.service(presentation::handlers::translation_handler::translate_comment);
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1").configure(public).service(
            web::scope("")
                .wrap(middleware::from_fn(auth))
                .configure(protected),
        ),
    );
}
