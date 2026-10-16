# RBAC

Phân quyền theo role. Xem ma trận đầy đủ trong repo backend tại `tests/README.md`. Trang này tóm tắt các quy tắc chính.

## Vai trò

| Vai trò | Mô tả |
|---------|-------|
| Guest | Chưa đăng nhập |
| User | Đã đăng nhập, `status = active` |
| Mod | Role `moderator`, có quyền moderation |
| Admin | Role `admin`, toàn quyền |

User ở trạng thái `pending` hoặc `banned` không truy cập được endpoint protected.

## Quy tắc chung

1. **Không ai tác động lên user ngang cấp hoặc cao hơn.** Mod chỉ động được vào user thường. Admin không động được vào admin khác.
2. **Mod chỉ tác động lên user thường.**
3. **Chỉ admin** đổi role, xoá cứng comment, xử lý report về staff.
4. **Không ai tự ban, tự đổi role chính mình.**
5. **Mod bị mute/ban → mất toàn bộ quyền mod,** chỉ còn quyền đọc.
6. **Report về staff → chỉ admin xử lý.**
7. **Report đã resolved → chỉ admin modify.**
8. **Comment deleted → không reply được, không đếm vào reply count.**

## Content moderation

Quy tắc #1 và #2 **không áp dụng** cho content (post, comment). Mod có thể xoá / hide / restore post hoặc comment của bất kỳ ai, kể cả mod / admin khác — vì đây là mục đích moderation.

## Điều kiện đặc biệt

### Post locked

Khi `comments_locked = true`:

- Tạo / reply / sửa / xoá comment — bị chặn với mọi người.
- Mod/admin vẫn đổi status comment và restore được.

### Post hidden hoặc xoá mềm

- Public endpoint trả 404.
- Mod dùng endpoint `/api/v1/manage/...` để xem.

### Actor bị muted

- Vẫn đọc nội dung bình thường.
- Mọi hành động write đều bị chặn (`403`).

### Actor bị banned

- Đọc nội dung public vẫn được.
- Mọi request protected đều bị chặn (`403`).
