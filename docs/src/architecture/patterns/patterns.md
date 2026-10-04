# Mô hình

## Repository

### Vai trò

Cầu nối giữa service và database. Che giấu chi tiết truy vấn.

### Phân chia

| Aggregate | Repository | Bảng quản lý |
|---|---|---|
| User | UserRepository | users, users_roles, users_follows, users_blocks |
| Post | PostRepository | posts, posts_tags, reactions, bookmarks |
| Comment | CommentRepository | comments |
| Tag | TagRepository | tags |
| Report | ReportRepository | reports |

Repository theo aggregate, không theo bảng.

### Vị trí

| Thành phần | Vị trí |
|---|---|
| Trait | `domains/*/repository.rs` |
| Impl | `infrastructure/database/repositories/*_repo.rs` |

Trait định nghĩa method. Impl viết Diesel query.

### Ví dụ

```
domains/user/repository.rs
  → trait UserRepository

infrastructure/database/repositories/user_repo.rs
  → struct PostgresUserRepo
  → impl UserRepository for PostgresUserRepo
```

## Service

### Vai trò

Chứa business logic. Không biết HTTP, không biết SQL.

### Vị trí

`domains/*/service.rs`.

### Ví dụ

```
domains/user/service.rs
  → struct UserService
  → fn create()
  → fn login()
  → fn get()
```

Service nhận repository qua constructor. Gọi repository để lấy/lưu dữ liệu.

## DTO

### Vai trò

Shape của dữ liệu qua HTTP API. Tách khỏi entity của database.

### Vị trí

`presentation/dto/`.

### Phân loại

| Loại | Mục đích | Ví dụ |
|---|---|---|
| Request | Nhận từ client | RegisterRequest, LoginRequest |
| Response | Trả về client | UserResponse, LoginResponse |

### Nguyên tắc

- Không chứa field nhạy cảm (password, password_hash).
- Chỉ chứa field client được phép gửi hoặc nhận.
- Convert từ entity qua `From`.

### Ví dụ

```
presentation/dto/user_dto.rs

UserResponse {
    id, username, email, avatar_url, bio, status
}
→ Không có password
```

## Handler

### Vai trò

Nhận HTTP request, gọi service, trả response.

### Vị trí

`presentation/handlers/*_handler.rs`.

### Nguyên tắc

- Không chứa business logic.
- Không query database.
- Parse input qua DTO.
- Gọi service trong `web::block`.
- Trả `HttpResponse`.

## Middleware

### Vai trò

Chặn request trước handler. Verify JWT, gắn `AuthUser`.

### Vị trí

`infrastructure/security/middleware.rs`.

### Luồng

```
Request
  → Đọc header Authorization
  → Bỏ prefix "Bearer "
  → verify_token
  → Gắn AuthUser vào extensions
  → Cho đi tiếp
```

### Áp dụng

Chỉ route protected. Route public không qua middleware.

## Extractor

### Vai trò

Cho phép handler lấy dữ liệu từ request qua tham số.

### Vị trí

`infrastructure/security/extractor.rs`.

### Ví dụ

```
#[get("/users/me")]
async fn get_me(user: AuthUser) -> ...
```

`AuthUser` tự động lấy từ request extensions.

## Adapter

### Vai trò

Kết nối dịch vụ bên ngoài (dịch thuật, ngữ pháp, bản đồ).

### Vị trí

Trong domain sử dụng.

- `domains/post/adapter.rs`
- `domains/comment/adapter.rs`

