# Chuyển URL cũ trên nginx

Đặt bảng map trong khối http và location trong server phục vụ frontend. Giữ các tệp dự phòng HTML cho máy chủ tĩnh chỉ phục vụ tệp.

```nginx
# Đổi các địa chỉ HTML đã phát hành sang thư mục chứa index.html.
map $uri $etsubi_clean_path {
    default "";
    /pages/ /;
    /pages/profile/ /profile/;
    /pages/index.html /;
    /pages/forum.html /forum/;
    /pages/post.html /post/;
    /pages/search.html /search/;
    /pages/support.html /support/;
    /pages/about.html /about/;
    /pages/settings.html /settings/;
    /pages/notifications.html /notifications/;
    /pages/profile/index.html /profile/;
    /pages/profile/login.html /login/;
    /pages/profile/register.html /register/;
    /pages/profile/register-advanced.html /register-advanced/;
    /pages/profile/edit.html /settings/;
}

# Giữ tham số như ?id= hoặc ?redirect=; các module dưới /pages/ vẫn phục vụ bình thường.
location /pages/ {
    if ($etsubi_clean_path != "") {
        return 301 $etsubi_clean_path$is_args$args;
    }
    try_files $uri $uri/ =404;
}
```
