# RBAC Tests

## Files

| File | Actor | Target |
|---|---|---|
| `user_admin.rs` | user | admin |
| `user_moderator.rs` | user | moderator |
| `moderator_moderator.rs` | moderator | moderator |
| `moderator_admin.rs` | moderator | admin |

Không có `admin_admin.rs`. Hành vi admin tác động admin khác giống moderator tác động moderator: bị chặn. Nếu cần, có thể thêm sau.

## Thứ tự role

```
admin > moderator > user
```

## Quy tắc được test

1. Actor không tác động được user có role bằng hoặc cao hơn mình (ban, mute, đổi role).
2. Chỉ admin đổi role.
3. Không ai tự ban, tự mute, tự đổi role chính mình.
4. Không ai assign role admin, kể cả admin.
5. Content moderation là ngoại lệ: moderator hide/restore được post của bất kỳ ai, kể cả admin.

## Nội dung từng file

### `user_admin.rs`

- User ban admin → 403
- User mute admin → 403
- User đổi role admin → 403
- Admin tự ban self → 403
- Admin ban user → 200
- Admin promote user lên moderator → 200
- Admin assign role admin → 403
- Admin ban admin khác → 403

### `user_moderator.rs`

- User ban moderator → 403
- User mute moderator → 403
- User đổi role moderator → 403
- Moderator ban user → 200
- Moderator đổi role user → 403

### `moderator_moderator.rs`

- Moderator ban moderator khác → 403
- Moderator mute moderator khác → 403
- Moderator tự ban self → 403
- Moderator hide post của moderator khác → 200 (content exception)

### `moderator_admin.rs`

- Moderator ban admin → 403
- Moderator mute admin → 403
- Moderator đổi role admin → 403
- Moderator hide post của admin → 200 (content exception)
- Admin ban moderator → 200

## Cách setup role

Test dùng `set_role_in_db` từ `common`:

```rust
let actor = register_and_login(&server.base);
let target = register_and_login(&server.base);
set_role_in_db(&actor.email, "moderator");
set_role_in_db(&target.email, "admin");
```

Không có endpoint tự promote user, nên phải đổi role trực tiếp trong DB. Middleware đọc role từ DB mỗi request, nên token không cần refresh sau khi đổi role.
