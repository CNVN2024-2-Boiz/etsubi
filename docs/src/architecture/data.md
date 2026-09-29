# 1.1. Dữ liệu

## 1.1.1. User

**Bảng:** `users`

### 1.1.1.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh |
| `username` | TEXT | NOT NULL, UNIQUE | Tên đăng nhập |
| `email` | TEXT | NOT NULL, UNIQUE | Email |
| `password` | TEXT | NOT NULL | Mật khẩu đã hash |
| `avatar_url` | TEXT | NULL | URL ảnh đại diện |
| `bio` | TEXT | NULL | Tiểu sử |
| `status` | TEXT | NOT NULL | `active` \| `inactive` \| `banned` \| `pending` |
| `created_at` | TIMESTAMPTZ | NOT NULL | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Thời điểm cập nhật |
| `muted_until` | TIMESTAMPTZ | NULL | Bị mute đến thời điểm này |

### 1.1.1.2. Quan hệ

- 1-n với `posts` (author_id)
- 1-n với `comments` (user_id)
- n-n với `roles` qua `users_roles`
- n-n với `users` (self) qua `users_follows`, `users_blocks`
- n-n với `posts` qua `reactions`, `bookmarks`

### 1.1.1.3. Business Rules

- Username và email phải unique.
- Không thể follow chính mình.
- Không thể block chính mình.
- User bị `banned` không thể đăng nhập.
- User bị `muted` (`muted_until > NOW()`) không thể post/comment.

---

## 1.1.2. Role

**Bảng:** `roles`

### 1.1.2.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh |
| `name` | TEXT | NOT NULL, UNIQUE | Tên role |
| `description` | TEXT | NULL | Mô tả |
| `created_at` | TIMESTAMPTZ | NOT NULL | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Thời điểm cập nhật |

### 1.1.2.2. Giá trị mặc định

`user`, `moderator`, `admin`.

### 1.1.2.3. Business Rules

- Tên role phải unique.
- Admin ⊇ Moderator ⊇ User.
- Không thể xoá role `admin`.

---

## 1.1.3. Post

**Bảng:** `posts`

### 1.1.3.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh |
| `author_id` | BIGINT | NOT NULL, FK → users.id | Tác giả |
| `title` | TEXT | NOT NULL | Tiêu đề |
| `content` | TEXT | NULL | Nội dung |
| `view_count` | INTEGER | NOT NULL | Số lượt xem |
| `status` | TEXT | NOT NULL | `draft` \| `published` \| `hidden` \| `deleted` |
| `comments_locked` | BOOLEAN | NOT NULL | Khoá bình luận |
| `created_at` | TIMESTAMPTZ | NOT NULL | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Thời điểm cập nhật |
| `deleted_at` | TIMESTAMPTZ | NULL | Thời điểm xoá mềm |

### 1.1.3.2. Quan hệ

- n-1 với `users` (author_id)
- 1-n với `comments`
- n-n với `tags` qua `posts_tags`
- n-n với `users` qua `reactions`, `bookmarks`
- 1-n với `reports`

### 1.1.3.3. Business Rules

- Chỉ publish được khi đang ở trạng thái `draft`.
- Không thể hide post đã `deleted`.
- `comments_locked` độc lập với `status`.
- Chỉ author hoặc admin mới sửa/xoá.

---

## 1.1.4. Comment

**Bảng:** `comments`

### 1.1.4.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh |
| `parent_id` | BIGINT | NULL, FK → comments.id | Comment cha (NULL nếu là gốc) |
| `post_id` | BIGINT | NOT NULL, FK → posts.id | Post chứa comment |
| `user_id` | BIGINT | NOT NULL, FK → users.id | Người bình luận |
| `content` | TEXT | NOT NULL | Nội dung |
| `status` | TEXT | NOT NULL | `visible` \| `hidden` \| `deleted` |
| `created_at` | TIMESTAMPTZ | NOT NULL | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Thời điểm cập nhật |

### 1.1.4.2. Quan hệ

- n-1 với `posts`
- n-1 với `users`
- 1-n với `comments` (self, reply)
- 1-n với `reports`

### 1.1.4.3. Business Rules

- Content không được rỗng.
- Reply phải cùng post với comment cha.
- Không comment được nếu post `comments_locked = true`.
- Xoá comment cha → xoá luôn reply (cascade).

---

## 1.1.5. Tag

**Bảng:** `tags`

### 1.1.5.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh |
| `name` | TEXT | NOT NULL, UNIQUE | Tên tag |
| `description` | TEXT | NULL | Mô tả |
| `created_at` | TIMESTAMPTZ | NOT NULL | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Thời điểm cập nhật |

### 1.1.5.2. Quan hệ

- n-n với `posts` qua `posts_tags`

### 1.1.5.3. Business Rules

- Tên tag phải unique.
- Giới hạn số tag mỗi post (enforce ở service).

---

## 1.1.6. Report

**Bảng:** `reports`

### 1.1.6.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | Định danh |
| `reporter_id` | BIGINT | NOT NULL, FK → users.id | Người báo cáo |
| `post_id` | BIGINT | NULL, FK → posts.id | Post bị báo cáo |
| `comment_id` | BIGINT | NULL, FK → comments.id | Comment bị báo cáo |
| `reason` | TEXT | NOT NULL | Lý do |
| `detail` | TEXT | NULL | Chi tiết thêm |
| `status` | TEXT | NOT NULL | `pending` \| `reviewing` \| `resolved` \| `rejected` |
| `created_at` | TIMESTAMPTZ | NOT NULL | Thời điểm tạo |
| `resolved_at` | TIMESTAMPTZ | NULL | Thời điểm xử lý xong |

### 1.1.6.2. Quan hệ

- n-1 với `users` (reporter_id)
- n-1 với `posts` (nullable)
- n-1 với `comments` (nullable)

### 1.1.6.3. Business Rules

- Đúng 1 trong 2 `post_id` hoặc `comment_id` có giá trị.
- 1 user chỉ report 1 target 1 lần.
- Không report nội dung của chính mình.
- Chỉ moderator/admin mới resolve/reject.

---

## 1.1.7. users_roles

**Bảng:** `users_roles`

### 1.1.7.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `user_id` | BIGINT | PK, FK → users.id | User |
| `role_id` | BIGINT | PK, FK → roles.id | Role |
| `assigned_at` | TIMESTAMPTZ | NOT NULL | Thời điểm gán |

### 1.1.7.2. Khóa chính

`(user_id, role_id)`

---

## 1.1.8. users_follows

**Bảng:** `users_follows`

### 1.1.8.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `follower_id` | BIGINT | PK, FK → users.id | Người theo dõi |
| `following_id` | BIGINT | PK, FK → users.id | Người được theo dõi |
| `followed_at` | TIMESTAMPTZ | NOT NULL | Thời điểm follow |

### 1.1.8.2. Khóa chính

`(follower_id, following_id)`

### 1.1.8.3. Ràng buộc

`follower_id <> following_id`

---

## 1.1.9. users_blocks

**Bảng:** `users_blocks`

### 1.1.9.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `blocker_id` | BIGINT | PK, FK → users.id | Người chặn |
| `blocked_id` | BIGINT | PK, FK → users.id | Người bị chặn |
| `blocked_at` | TIMESTAMPTZ | NOT NULL | Thời điểm chặn |

### 1.1.9.2. Khóa chính

`(blocker_id, blocked_id)`

### 1.1.9.3. Ràng buộc

`blocker_id <> blocked_id`

---

## 1.1.10. posts_tags

**Bảng:** `posts_tags`

### 1.1.10.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `post_id` | BIGINT | PK, FK → posts.id | Post |
| `tag_id` | BIGINT | PK, FK → tags.id | Tag |

### 1.1.10.2. Khóa chính

`(post_id, tag_id)`

---

## 1.1.11. reactions

**Bảng:** `reactions`

### 1.1.11.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `user_id` | BIGINT | PK, FK → users.id | Người thả |
| `post_id` | BIGINT | PK, FK → posts.id | Post được thả |
| `emoji` | TEXT | NOT NULL | Emoji |
| `reacted_at` | TIMESTAMPTZ | NOT NULL | Thời điểm thả |

### 1.1.11.2. Khóa chính

`(user_id, post_id)`

---

## 1.1.12. bookmarks

**Bảng:** `bookmarks`

### 1.1.12.1. Thuộc tính

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `user_id` | BIGINT | PK, FK → users.id | Người lưu |
| `post_id` | BIGINT | PK, FK → posts.id | Post được lưu |
| `bookmarked_at` | TIMESTAMPTZ | NOT NULL | Thời điểm lưu |

### 1.1.12.2. Khóa chính

`(user_id, post_id)`

---

## 1.1.13. Ánh xạ kiểu dữ liệu

| PostgreSQL | Diesel | Rust |
|---|---|---|
| `BIGINT` | `Int8` | `i64` |
| `INTEGER` | `Int4` | `i32` |
| `TEXT` | `Text` | `String` |
| `BOOLEAN` | `Bool` | `bool` |
| `TIMESTAMPTZ` | `Timestamptz` | `DateTime<Utc>` |
| `NULL` | `Nullable<T>` | `Option<T>` |
