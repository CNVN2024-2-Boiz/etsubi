# CRUD Tests

## Files

| File | Domain | Nội dung chính |
|---|---|---|
| `user.rs` | Auth + profile | Register, login, logout, `/my`, đổi mật khẩu |
| `post.rs` | Post | CRUD, ownership, staff moderation, comment lock |
| `comment.rs` | Comment | CRUD, reply tree, ownership, staff moderation, restore |
| `bookmark.rs` | Bookmark | Add/remove, conflict, post đã xoá bị ẩn |
| `follow.rs` | Follow | Follow/unfollow, self-follow, conflict |
| `reaction.rs` | Reaction | Upsert, đổi emoji, remove, summary, list |
| `tag.rs` | Tag | Attach/detach, ownership, conflict, list posts theo tag |
| `translation.rs` | Translation | Auth guard, missing post, missing provider |

## Nội dung test

Mỗi file phủ các nhánh:

- Happy path: full CRUD flow
- Validation: input không hợp lệ → 4xx
- Auth: 401 khi thiếu token
- Ownership: 403 khi không phải owner
- Moderation: 403 hoặc 200 tùy role
- Edge case: missing resource, deleted resource, hành động lặp

Không test serialization shape, không test wording của error message, không test OpenAPI.

## Parametrize

Validation dùng `#[rstest]`:

```rust
#[rstest]
#[case::empty(      "".to_string(),      400)]
#[case::whitespace( "   ".to_string(),   400)]
#[case::too_long(   "a".repeat(10_001),  400)]
fn create_comment_validation(#[case] content: String, #[case] expected: u16) { ... }
```

Tên case (`::empty`, `::whitespace`) xuất hiện trong output `cargo test`. Khi fail, biết ngay case nào.

Khi viết case mới, kiểm tra param có thực sự được truyền vào request body. Case `bad_language` từng fail vì test hardcode `"language": "en"` thay vì dùng param.

## Helper trong file

Mỗi file có helper riêng để giảm boilerplate:

```rust
fn create_post(user: &TestUser, server: &TestServer, title: &str) -> String { ... }
fn create_comment(user: &TestUser, server: &TestServer, post_id: &str, content: &str, parent_id: Option<&str>) -> Value { ... }
```

Helper đặt private trong file, không export. Trả `String` (id) thay vì `Value` để test dễ đọc.

## Chi tiết từng file

### `user.rs`

- Full flow: register → login → `/my` → logout → token cũ bị từ chối (401)
- Register validation: password ngắn, language sai, username ngắn
- Login reject: sai password, email không tồn tại
- Lấy user public
- Cập nhật profile (bio, school)
- Đổi mật khẩu: token cũ invalidated, password mới đăng nhập được

### `post.rs`

- Full CRUD: create → get → list theo author → update → delete → 404
- Validation: title rỗng, toàn whitespace, title > 255, content > 100k
- Auth: 401 khi không có token
- Ownership: user B không update/delete post của A → 403
- Staff: hide/restore, post ẩn không xuất hiện trong list public
- Comment lock: khoá thì comment mới bị từ chối (403), mở khoá thì comment được

### `comment.rs`

- Full CRUD, sau delete thì GET trả 404
- Reply: `parent_id` được set đúng, reply chéo post bị từ chối (404)
- Validation: rỗng, whitespace, > 10k ký tự
- Auth và ownership
- Staff: đổi status visible/hidden, restore comment đã xoá
- `/my/comments` list, comment đã xoá bị ẩn

### `bookmark.rs`

- Add → list → kiểm tra status → remove
- Bookmark trùng → 409
- Remove bookmark không tồn tại → 404
- Bookmark post không tồn tại → 404
- Auth guard
- Post đã xoá bị ẩn khỏi `/my/bookmarks`

### `follow.rs`

- Follow → list followers/following → kiểm tra status (`is_following`, `is_followed_by`)
- Unfollow xoá relationship
- Self-follow → 400
- Follow trùng → 409
- User không tồn tại → 404
- Auth guard

### `reaction.rs`

- Upsert → summary group theo emoji
- Đổi emoji: upsert ghi đè
- Remove → GET lại trả 404
- Emoji validation: rỗng, whitespace, > 32 ký tự
- Post không tồn tại → 404
- Auth guard
- List toàn bộ reaction trên 1 post

### `tag.rs`

- List toàn bộ tag (seed 5 tag)
- Get theo id
- Attach → get post tags → get tag posts → detach
- Attach trùng → 409
- Detach tag chưa attach → 409
- Ownership: chỉ author của post attach/detach được
- Tag không tồn tại → 404

### `translation.rs`

- Auth guard
- Post không tồn tại → 404
- Không cấu hình provider → 503 (skip nếu `TRANSLATION_API_KEY` được set)

Không test translation thật vì: cần API key trả phí, response phụ thuộc LLM (không deterministic). Cache đã được test gián tiếp qua flow edit post (tạo translation → edit → cache bị invalidate).

## Khi thêm test mới

1. Đặt vào đúng file theo domain.
2. Dùng `TestServer::start()` + `register_and_login()` từ `common`.
3. Nếu tạo resource rác ngoài user, phải cleanup tay — hiện chỉ `TestUser` có Drop guard.
4. Cập nhật bảng "Files" và mục "Chi tiết từng file" ở trên.
