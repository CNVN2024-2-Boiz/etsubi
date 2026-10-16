# Ma trận phân quyền

## Chú giải

| Ký hiệu | Ý nghĩa |
|---------|---------|
| ✅ | Được phép |
| ❌ | Không được phép |
| ⚠️ | Có điều kiện (ghi chú bên dưới) |
| — | Không áp dụng |

**Vai trò:**
- **Guest** — chưa đăng nhập
- **User** — đã đăng nhập, chưa mute/ban
- **Mod (active)** — moderator, chưa mute/ban
- **Mod (muted/ban)** — moderator đang bị mute hoặc ban
- **Admin** — quản trị viên (chỉ có 1)

---

## 1. User

| Hành động | Guest | User | Mod (active) | Mod (muted/ban) | Admin |
|-----------|:-----:|:----:|:------------:|:---------------:|:-----:|
| Xem profile public | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem profile mình | ❌ | ✅ | ✅ | ✅ | ✅ |
| Sửa profile mình | ❌ | ✅ | ✅ | ❌ | ✅ |
| Sửa profile người khác | ❌ | ❌ | ❌ | ❌ | ✅ |
| Đổi status user khác | ❌ | ❌ | ✅ (chỉ User) | ❌ | ✅ |
| Đổi role user khác | ❌ | ❌ | ❌ | ❌ | ✅ |
| Gỡ mute/ban cho Mod | ❌ | ❌ | ❌ | ❌ | ✅ |
| Tự ban chính mình | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tự đổi role chính mình | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 2. Post

| Hành động | Guest | User | Mod (active) | Mod (muted/ban) | Admin |
|-----------|:-----:|:----:|:------------:|:---------------:|:-----:|
| Đọc post published | ✅ | ✅ | ✅ | ✅ | ✅ |
| Đọc post hidden | ❌ | ❌ | ✅ | ✅ | ✅ |
| Đọc post đã xoá mềm | ❌ | ❌ | ✅ | ✅ | ✅ |
| Tạo post | ❌ | ✅ | ✅ | ❌ | ✅ |
| Sửa nội dung post mình | — | ✅ | ✅ | ❌ | ✅ |
| Sửa nội dung post người khác | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xoá mềm post mình | — | ✅ | ✅ | ❌ | ✅ |
| Xoá mềm post người khác | ❌ | ❌ | ✅ | ❌ | ✅ |
| Đổi status post | ❌ | ❌ | ✅ | ❌ | ✅ |
| Restore post | ❌ | ❌ | ✅ | ❌ | ✅ |
| Lock / Unlock comment | ❌ | ❌ | ✅ | ❌ | ✅ |

---

## 3. Comment

| Hành động | Guest | User | Mod (active) | Mod (muted/ban) | Admin |
|-----------|:-----:|:----:|:------------:|:---------------:|:-----:|
| Đọc comment visible (post published) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Đọc comment hidden | ❌ | ❌ | ✅ | ✅ | ✅ |
| Đọc comment deleted (nội dung gốc) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Thấy placeholder comment deleted | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| Đọc comment của post hidden/xoá | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tạo comment | ❌ | ✅ | ✅ | ❌ | ✅ |
| Reply comment visible | ❌ | ✅ | ✅ | ❌ | ✅ |
| Reply comment deleted | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sửa comment mình | — | ✅ | ✅ | ❌ | ✅ |
| Sửa comment người khác | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xoá mềm comment mình | — | ✅ | ✅ | ❌ | ✅ |
| Xoá mềm comment người khác | ❌ | ❌ | ✅ | ❌ | ✅ |
| Đổi status comment | ❌ | ❌ | ✅ | ❌ | ✅ |
| Restore comment | ❌ | ❌ | ✅ | ❌ | ✅ |
| Xoá cứng comment | ❌ | ❌ | ❌ | ❌ | ✅ |

**Chú giải ⚠️:** Chỉ thấy placeholder "[deleted]" khi comment có reply con. Không có reply con → ẩn hoàn toàn.

**Chú giải "Đọc comment của post hidden/xoá":** Cả mod và admin cũng không đọc được comment qua endpoint public. Mod dùng endpoint `/manage/posts/{id}/comments` để xem.

---

## 4. Report

| Hành động | Guest | User | Mod (active) | Mod (muted/ban) | Admin |
|-----------|:-----:|:----:|:------------:|:---------------:|:-----:|
| Tạo report | ❌ | ✅ | ✅ | ❌ | ✅ |
| Xem report của mình | — | ✅ | ✅ | ✅ | ✅ |
| Xem report của người khác | ❌ | ❌ | ✅ | ✅ | ✅ |
| Xử lý report về User | ❌ | ❌ | ✅ | ❌ | ✅ |
| Xử lý report về Mod | ❌ | ❌ | ❌ | ❌ | ✅ |
| Xử lý report về Admin | ❌ | ❌ | ❌ | ❌ | ✅ |
| Modify report đã resolved | ❌ | ❌ | ❌ | ❌ | ✅ |
| Xoá report | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 5. Điều kiện đặc biệt

### 5.1. Post locked (`comments_locked = true`)

| Hành động | Ai bị chặn |
|-----------|------------|
| Tạo / reply comment | Mọi người |
| Sửa comment | Mọi người |
| Xoá comment | Mọi người |
| Đọc comment | Không ai |
| Đổi status comment | Không ai (mod active + admin vẫn làm được) |
| Restore comment | Không ai (mod active + admin vẫn làm được) |
| Lock / Unlock | Không ai (mod active + admin vẫn làm được) |

### 5.2. Post hidden hoặc đã xoá mềm

| Hành động | Ai bị chặn |
|-----------|------------|
| Đọc post (public endpoint) | Guest, User, Mod, Admin |
| Đọc comment (public endpoint) | Guest, User, Mod, Admin |
| Comment / reply / sửa / xoá | Mọi người |
| Tạo report | Guest, User |
| Mod xem qua endpoint `/manage` | Không ai (mod + admin vẫn làm được) |

### 5.3. Comment deleted

| Hành động | Ai bị chặn |
|-----------|------------|
| Reply | Mọi người |
| Sửa | Owner |
| Đếm vào reply count | Không đếm |

### 5.4. Actor bị muted

| Quyền | Trạng thái |
|-------|------------|
| Đọc mọi nội dung | Giữ nguyên |
| Xem report người khác | Giữ nguyên |
| Tất cả hành động write | Mất |
| Tất cả hành động mod | Mất |

### 5.5. Actor bị banned

| Quyền | Trạng thái |
|-------|------------|
| Đọc nội dung public | Giữ nguyên |
| Đọc nội dung protected | Mất |
| Tất cả hành động write | Mất |
| Tất cả hành động mod | Mất |

### 5.6. Admin

| Đặc điểm | Giá trị |
|----------|---------|
| Số lượng | 1 |
| Bị mute/ban | Không bao giờ |
| Bị đổi role | Không bao giờ |
| Bị sửa profile bởi người khác | Không bao giờ |

---

## 6. Quy tắc chung

| # | Quy tắc |
|---|---------|
| 1 | Không ai tác động lên **user** ngang cấp hoặc cao hơn (đổi status, đổi role) |
| 2 | Mod chỉ tác động lên **user thường** |
| 3 | Chỉ admin đổi role user, xoá cứng comment, xử lý report về staff |
| 4 | Không ai tự ban, tự đổi role chính mình |
| 5 | Mod bị mute/ban → mất **toàn bộ** quyền mod, giữ quyền đọc |
| 6 | Report về staff → chỉ admin xử lý |
| 7 | Report đã resolved → chỉ admin modify |
| 8 | Comment deleted → không ai reply được, không đếm vào reply count |

**Chú giải quy tắc #1 và #2:**
- Áp dụng cho **quản lý user** (đổi status, đổi role).
- **Không áp dụng** cho moderation content (post, comment). Mod có thể xoá/hide/restore content của bất kỳ ai, kể cả mod/admin khác — vì mục đích moderation.
- Nếu sau này muốn áp dụng rule #1/#2 cho content, cần thêm logic vào `PostService`/`CommentService` để load author role và so sánh.
