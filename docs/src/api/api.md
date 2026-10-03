# API

Base URL: `/api/v1`

## Xác thực

Route protected yêu cầu header:

```
Authorization: Bearer <token>
```

## Route công khai

| Method | Path | Mô tả |
|---|---|---|
| GET | /health | Kiểm tra server |
| POST | /auth/register | Đăng ký |
| POST | /auth/login | Đăng nhập |

## Route bảo vệ

Yêu cầu JWT. Middleware chạy trước handler.

---

## Auth

### POST /auth/register

Tạo tài khoản mới.

Request:

```json
{
  "username": "alice",
  "email": "alice@test.com",
  "password": "12345678"
}
```

Response 201:

```json
{
  "user_id": 1
}
```

Lỗi:

- 400 — email đã tồn tại
- 400 — username quá ngắn

### POST /auth/login

Đăng nhập, nhận JWT.

Request:

```json
{
  "email": "alice@test.com",
  "password": "12345678"
}
```

Response 200:

```json
{
  "user_id": 1,
  "token": "eyJhbGc..."
}
```

Lỗi:

- 401 — sai thông tin đăng nhập

---

## User

### GET /users/me

Lấy thông tin user đang đăng nhập.

Response 200:

```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@test.com",
  "avatar_url": null,
  "bio": null,
  "status": "active"
}
```

Lỗi:

- 401 — không có token hoặc token không hợp lệ

### GET /users/{id}

Lấy thông tin user theo id.

Response 200:

```json
{
  "id": 5,
  "username": "bob",
  "email": "bob@test.com",
  "avatar_url": null,
  "bio": null,
  "status": "active"
}
```

Lỗi:

- 401 — không có token
- 404 — không tìm thấy user

---

## Post

### GET /posts

Lấy danh sách bài viết.

Query:

| Param | Kiểu | Mô tả |
|---|---|---|
| tag | string | Lọc theo tag |
| sort | string | newest hoặc popular |
| search | string | Tìm kiếm tiêu đề |
| user_id | int | Lọc theo tác giả |
| page | int | Trang |
| limit | int | Số item mỗi trang |

Response 200:

```json
{
  "posts": [
    {
      "id": 1,
      "title": "Hello",
      "author_id": 1,
      "status": "published",
      "created_at": "2026-10-03T12:00:00Z"
    }
  ],
  "total": 100
}
```

### POST /posts

Tạo bài viết mới, mặc định draft.

Request:

```json
{
  "title": "Hello",
  "content": "World"
}
```

Response 201:

```json
{
  "id": 1,
  "title": "Hello",
  "status": "draft",
  "author_id": 1
}
```

Lỗi:

- 401 — không có token
- 403 — user bị ban hoặc mute

### GET /posts/{id}

Lấy chi tiết bài viết. Tăng `view_count`.

Response 200:

```json
{
  "id": 1,
  "title": "Hello",
  "content": "World",
  "author_id": 1,
  "status": "published",
  "comments_locked": false,
  "created_at": "2026-10-03T12:00:00Z"
}
```

Lỗi:

- 404 — không tìm thấy bài viết

### PATCH /posts/{id}

Cập nhật bài viết.

Request:

```json
{
  "title": "New title",
  "content": "New content"
}
```

Response 200: bài viết sau khi sửa.

Lỗi:

- 403 — không phải chủ bài viết
- 404 — không tìm thấy

### DELETE /posts/{id}

Xóa mềm bài viết.

Response 204.

Lỗi:

- 403 — không phải chủ hoặc moderator
- 404 — không tìm thấy

---

## Comment

### GET /posts/{post_id}/comments

Lấy danh sách bình luận của bài viết.

Response 200:

```json
[
  {
    "id": 1,
    "post_id": 1,
    "user_id": 2,
    "content": "Nice post",
    "parent_id": null,
    "status": "visible",
    "created_at": "2026-10-03T12:00:00Z"
  }
]
```

### POST /posts/{post_id}/comments

Tạo bình luận.

Request:

```json
{
  "content": "Nice post",
  "parent_id": null
}
```

Response 201: bình luận vừa tạo.

Lỗi:

- 403 — bài viết đang khóa bình luận
- 404 — không tìm thấy bài viết

---

## Reaction

### PUT /posts/{post_id}/reaction

Thả hoặc đổi reaction.

Request:

```json
{
  "emoji": "👍"
}
```

Response 200:

```json
{
  "user_id": 1,
  "post_id": 5,
  "emoji": "👍",
  "reacted_at": "2026-10-03T12:00:00Z"
}
```

### DELETE /posts/{post_id}/reaction

Bỏ reaction.

Response 204.

---

## Bookmark

### PUT /posts/{post_id}/bookmark

Lưu bài viết.

Response 200.

### DELETE /posts/{post_id}/bookmark

Bỏ lưu.

Response 204.

---

## Report

### POST /posts/{post_id}/reports

Báo cáo bài viết.

Request:

```json
{
  "reason": "spam",
  "detail": "Nội dung quảng cáo"
}
```

Response 201:

```json
{
  "id": 1,
  "status": "pending"
}
```

Lỗi:

- 400 — đã report trước đó
- 400 — tự report nội dung của mình

### POST /comments/{comment_id}/reports

Báo cáo bình luận.

Request và response giống report post.

### GET /reports

Danh sách report. Yêu cầu moderator.

Query:

| Param | Kiểu | Mô tả |
|---|---|---|
| status | string | pending, reviewing, resolved, rejected |

Response 200: danh sách report.

### PATCH /reports/{id}

Cập nhật trạng thái report. Yêu cầu moderator.

Request:

```json
{
  "status": "resolved"
}
```

Response 200: report sau khi cập nhật.

---

## Role

### GET /users/{user_id}/roles

Lấy danh sách role của user. Yêu cầu admin.

Response 200:

```json
[
  {
    "id": 1,
    "name": "user",
    "description": "Người dùng thường"
  }
]
```

### PUT /users/{user_id}/roles/{role_id}

Gán role cho user. Yêu cầu admin.

Response 200.

Lỗi:

- 403 — không phải admin
- 400 — không được gán role admin

### DELETE /users/{user_id}/roles/{role_id}

Gỡ role khỏi user. Yêu cầu admin.

Response 204.

Lỗi:

- 403 — không phải admin
- 400 — không được gỡ role admin

---

## Mã trạng thái

| Code | Nghĩa |
|---|---|
| 200 | Thành công |
| 201 | Tạo thành công |
| 204 | Xóa thành công |
| 400 | Yêu cầu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không có quyền |
| 404 | Không tìm thấy |
| 409 | Xung đột dữ liệu |
| 422 | Dữ liệu không hợp lệ |
| 500 | Lỗi server |
