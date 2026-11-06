# Integration Tests

## Cấu trúc

```
tests/
├── common/mod.rs              # Helper dùng chung
├── crud/                      # Test CRUD từng entity
├── rbac/                      # Test phân quyền
└── mod.rs                     # Entry point
```

Cargo chỉ discover `tests/mod.rs` là 1 integration test crate. Các file trong `crud/` và `rbac/` là module con, không chạy riêng.

## Setup

### 1. Tạo DB test

```bash
psql -h localhost -p 11342 -U etsubi -c "CREATE DATABASE etsubi_test;"
```

### 2. Chạy migration

```bash
cd backend
DATABASE_URL=postgres://etsubi:secret@localhost:11342/etsubi_test \
  diesel migration run
```

### 3. Tạo `backend/.env.test`

```env
DATABASE_URL=postgres://etsubi:secret@localhost:11342/etsubi_test
JWT_KEY=test-secret
JWT_EXPIRY_HOURS=24
SERVER_HOST=127.0.0.1
SERVER_PORT=0
CORS_ALLOWED_ORIGINS=*
TRANSLATION_PROVIDER=
```

File này gitignored, không commit.

## Chạy test

```bash
cd backend
set -a; source .env.test; set +a
cargo test --test mod -- --nocapture --test-threads=1
```

- `--test-threads=1`: bắt buộc. Mỗi test spawn 1 server + pool riêng; chạy song song dễ vượt `max_connections` của Postgres.
- `--nocapture`: thấy log `[cleanup]`, hữu ích khi debug.
- Phải `source .env.test`. Nếu không, `dotenvy` đọc `backend/.env` và test sẽ ghi vào DB dev.

Chạy 1 file hoặc 1 test:

```bash
cargo test --test mod crud::post -- --test-threads=1
cargo test --test mod crud::post::full_post_crud_flow -- --test-threads=1
```

## Helper trong `common/mod.rs`

| Helper | Chức năng |
|---|---|
| `TestServer::start()` | Spawn server ở random port, chờ `/health` ready. Drop tự stop. |
| `register_and_login(base)` | Tạo user unique, trả `TestUser` (client + token + id). Drop tự xoá user. |
| `cleanup_user(email)` | Xoá user theo email. Dùng khi test không giữ `TestUser`. |
| `set_role_in_db(email, role)` | Đổi role trực tiếp trong DB. Cần cho test RBAC vì không có endpoint tự promote. |

`TestUser` có `impl Drop` nên không cần cleanup tay ở cuối test — user tự xoá khi test kết thúc, kể cả khi panic.

## Quy ước

- Mỗi test tự tạo `TestServer` riêng. Không share giữa các test.
- Email user luôn có UUID (`test+<uuid>@example.com`) để tránh conflict giữa các test.
- Assertion kiểm tra cả status code và side effect (DB không đổi khi kỳ vọng reject).
- Không hardcode giá trị trong body khi đã có `#[case]` param — dùng param.

## Tổng quan test hiện tại

Khoảng 85 test, thời gian ~5s với `--test-threads=1`. Bao gồm:

- `crud/`: user, post, comment, bookmark, follow, reaction, tag, translation
- `rbac/`: user-admin, user-moderator, moderator-moderator, moderator-admin

Chi tiết từng file trong `crud/README.md` và `rbac/README.md`.

## TODO

- Pagination: cập nhật assertion của các test list khi thêm paginate (response đổi từ array sang object có `items`, `total`, ...). Thêm test boundary: page overflow, `per_page=0`, tiebreaker khi `created_at` bằng nhau.
- Translation full flow: cần mock translation server để test cache hit/miss và invalidate khi edit post/comment. Hiện chỉ test auth guard và missing post.
- Grammar suggestion, map, live view: chưa có test.

