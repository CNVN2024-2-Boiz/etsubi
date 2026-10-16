# Features

## Đã có

### Authentication

- Đăng ký bằng username / email / password.
- Xác thực email qua link gửi trong mail. User mới ở trạng thái `pending`, phải verify để thành `active` và login được.
- Đăng nhập → nhận JWT access token.
- Gửi lại email xác thực nếu chưa nhận được.

### User

- Xem profile public (username, avatar, bio, role, status).
- Xem profile của mình.
- Sửa profile của mình (username, bio, avatar).
- Mod/admin: đổi status user, đổi role user.

### Post

- Tạo, sửa, xoá mềm bài viết.
- Xem bài published.
- Mod/admin: đổi status (hide / publish), restore bài đã xoá.

### Comment

- Tạo bình luận và reply.
- Sửa, xoá mềm bình luận của mình.
- Mod/admin: đổi status, restore, xem cả comment hidden/deleted.
- Post có thể lock comment.

### Moderation

- Ban / unban / verify lại user.
- Ẩn / hiện post.
- Ẩn / hiện comment.
- Restore post và comment đã xoá mềm.

## Todo

- **Report** — schema DB đã có, chưa implement.
- **Tag** — schema DB đã có, chưa implement CRUD.
- **Reaction, bookmark, follow, block** — schema có, chưa có endpoint.
- **Reset password / magic link / đổi email** — chưa làm.
- **Rate limiting** — chưa áp dụng.
- **Xoá cứng** — chỉ admin, chưa có endpoint.

## Email

Hai provider:

- **Console** (dev) — log link verify ra terminal, không gửi thật.
- **Resend** (prod) — gửi email qua Resend API.

Chọn qua biến `EMAIL_PROVIDER` trong `.env`.
