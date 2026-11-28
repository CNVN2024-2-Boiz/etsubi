# Kiểm thử phân quyền theo vai trò (`tests/rbac/`)

Thư mục `tests/rbac/` chứa bộ kịch bản kiểm thử tích hợp chuyên biệt cho cơ chế kiểm soát truy cập theo vai trò (RBAC) và trạng thái tài khoản trong hệ thống Etsubi, xác minh ranh giới quyền hạn giữa các cấp bậc `user`, `moderator` và `admin`.

## Cấu trúc các thành phần

```text
tests/rbac/
├── mod.rs                  # Khai báo và xuất toàn bộ module kiểm thử phân quyền
├── moderator_admin.rs      # Kiểm thử ranh giới quyền hạn giữa vai trò moderator và admin
├── moderator_moderator.rs  # Kiểm thử quy tắc ngăn chặn moderator tác động lên tài khoản ngang cấp
├── user_admin.rs           # Kiểm thử từ chối truy cập của vai trò user đối với các tác vụ của admin
└── user_moderator.rs       # Kiểm thử từ chối truy cập của vai trò user đối với các tác vụ kiểm duyệt của moderator

```

## Ma trận phân quyền

## 1. Ma trận phân quyền quản lý người dùng và vai trò

| Hành động / Nghiệp vụ | Khách (Chưa xác thực) | `user` (Chính chủ) | `user` (Tài khoản khác) | `moderator` | `admin` | Điều kiện và quy tắc chặn |
| --- | --- | --- | --- | --- | --- | --- |
| Đăng ký / Đăng nhập | Có | — | — | — | — | Từ chối đăng nhập nếu tài khoản đang `banned` |
| Đăng xuất (thu hồi toàn bộ JWT) | Không | Có | Không | Có | Có | Tăng `token_version` trong bảng `users` |
| Xem hồ sơ công khai người dùng | Có | Có | Có | Có | Có | — |
| Xem và cập nhật hồ sơ cá nhân | Không | Có | Không | Có (chính chủ) | Có (chính chủ) | Trả về `403 Forbidden` nếu sửa hồ sơ người khác |
| Đổi mật khẩu cá nhân | Không | Có | Không | Có (chính chủ) | Có (chính chủ) | Chỉ áp dụng cho tài khoản có mật khẩu cục bộ |
| Tự xóa tài khoản cá nhân | Không | Có | Không | Có (chính chủ) | **Không** | Chặn `admin` tự xóa (`CannotDeleteAdmin`) |
| Khóa / Mở khóa tài khoản (`banned`) | Không | Không | Không | Chỉ với `user` | Với `user`, `moderator` | Cấm tự khóa bản thân (`CannotBanSelf`) và cấp ngang hoặc cao hơn (`CannotModifyHigherRole`) |
| Cấm tương tác có thời hạn (`muted_until`) | Không | Không | Không | Chỉ với `user` | Với `user`, `moderator` | Cấm tự cấm bản thân (`CannotMuteSelf`) và cấp ngang hoặc cao hơn (`CannotModifyHigherRole`) |
| Thay đổi vai trò (`user` / `moderator`) | Không | Không | Không | Không | Với `user`, `moderator` | Chỉ `admin` được thao tác; cấm tự đổi vai trò và cấm gán quyền `admin` (`CannotAssignAdminRole`) |

---

## 2. Ma trận phân quyền bài viết, bình luận và thẻ phân loại

| Hành động / Nghiệp vụ | Khách (Chưa xác thực) | `user` (Tác giả) | `user` (Người khác) | `moderator` | `admin` | Điều kiện và quy tắc chặn |
| --- | --- | --- | --- | --- | --- | --- |
| Xem bài viết, bình luận công khai | Có | Có | Có | Có | Có | Ẩn các bản ghi đã xóa mềm (`deleted_at`) hoặc bị ẩn trạng thái |
| Tạo bài viết mới | Không | Có | — | Có | Có | Yêu cầu tài khoản `active` và không trong thời gian `muted_until` |
| Chỉnh sửa nội dung bài viết | Không | Có | Không | Không | Không | Chỉ tác giả được sửa; từ chối nếu bài viết đang bị ẩn (`HiddenCannotEdit`) |
| Xóa mềm bài viết (`deleted_at`) | Không | Có | Không | Không | Không | Chỉ tác giả thực hiện xóa mềm qua endpoint bài viết |
| Khóa / Mở khóa bình luận bài viết | Không | Có | Không | Có | Có | Tác giả bài viết hoặc nhân sự quản trị (`RequiresStaff`) |
| Thay đổi trạng thái kiểm duyệt bài viết | Không | Không | Không | Có | Có | Yêu cầu vai trò `moderator` hoặc `admin` (`RequiresStaff`) |
| Khôi phục bài viết đã xóa mềm | Không | Không | Không | Có | Có | Yêu cầu vai trò `moderator` hoặc `admin` (`RequiresStaff`) |
| Tạo bình luận / Phản hồi bình luận | Không | Có | Có | Có | Có | Từ chối nếu bài viết đã khóa bình luận (`PostLocked`) |
| Chỉnh sửa / Xóa mềm bình luận | Không | Có | Không | Không | Không | Chỉ tác giả bình luận được phép thao tác |
| Xem danh sách bình luận kiểm duyệt | Không | Không | Không | Có | Có | Hiển thị mọi trạng thái bình luận phục vụ kiểm duyệt |
| Thay đổi trạng thái / Khôi phục bình luận | Không | Không | Không | Có | Có | Yêu cầu vai trò `moderator` hoặc `admin` (`RequiresStaff`) |
| Xem danh sách thẻ và bài viết theo thẻ | Có | Có | Có | Có | Có | — |
| Gắn thẻ / Gỡ thẻ khỏi bài viết | Không | Có | Không | Có | Có | Chỉ tác giả bài viết hoặc nhân sự quản trị (`moderator`, `admin`) |

---

## 3. Ma trận phân quyền tương tác, thông báo và dịch thuật

| Hành động / Nghiệp vụ | Khách (Chưa xác thực) | `user` (Chính chủ) | `user` (Người khác) | `moderator` | `admin` | Điều kiện và quy tắc chặn |
| --- | --- | --- | --- | --- | --- | --- |
| Lưu / Bỏ lưu bài viết (`bookmarks`) | Không | Có | Không | Có | Có | Lưu theo định danh tài khoản đang xác thực |
| Thả / Đổi / Gỡ biểu cảm (`reactions`) | Không | Có | Không | Có | Có | Xem thống kê biểu cảm công khai không cần đăng nhập |
| Theo dõi / Hủy theo dõi người dùng | Không | Có | Có | Có | Có | Cấm tự theo dõi chính mình (`CannotFollowSelf`) |
| Gửi thông báo nhắc tên / Người theo dõi | Không | Có | Có | Có | Có | Cấm tự gửi thông báo cho chính mình (`CannotNotifySelf`) |
| Tạo thông báo loại hệ thống | Không | Không | Không | Có | Có | Các loại thông báo quản trị yêu cầu `moderator` hoặc `admin` |
| Xem, đánh dấu đã đọc, xóa thông báo | Không | Có | Không | Có (chính chủ) | Có (chính chủ) | Chỉ thao tác được trên thông báo thuộc sở hữu của tài khoản |
| Yêu cầu dịch bài viết / bình luận | Không | Có | Có | Có | Có | Dịch sang ngôn ngữ cấu hình (`language`) của tài khoản yêu cầu |

---

## 4. Ma trận kiểm soát theo trạng thái tài khoản (Middleware HTTP)

| Trạng thái tài khoản | Truy vấn đọc (`GET`) | Thao tác ghi (`POST`, `PATCH`, `PUT`, `DELETE`) | Đăng xuất (`/auth/logout`) | Ghi chú xử lý |
| --- | --- | --- | --- | --- |
| `active` (Bình thường) | Có | Có | Có | Cho phép thực thi đầy đủ quyền theo vai trò |
| `active` + đang trong `muted_until` | Có | **Không** | Có | Chặn toàn bộ hành vi tạo hoặc chỉnh sửa nội dung cho tới khi hết hạn cấm |
| `banned` (Bị khóa) | **Không** | **Không** | **Không** | Từ chối mọi yêu cầu xác thực và từ chối cấp token mới khi đăng nhập |

## Tính năng và phạm vi kiểm thử

* **Bảo vệ các endpoint quản trị khỏi người dùng thông thường (`user_moderator.rs`, `user_admin.rs`)**: Xác nhận hệ thống trả về mã lỗi `403 Forbidden` khi tài khoản vai trò `user` thực hiện các thao tác kiểm duyệt bài viết, bình luận, khóa tài khoản, cấm tương tác hoặc thay đổi vai trò người dùng khác.
* **Kiểm soát phân cấp ngang hàng (`moderator_moderator.rs`)**: Kiểm tra quy tắc ngăn chặn tài khoản `moderator` chỉnh sửa trạng thái hoặc cấm tương tác đối với một `moderator` khác hay `admin` (`CannotModifyHigherRole`), đồng thời ngăn chặn tự khóa hoặc tự cấm tương tác chính mình.
* **Phân định đặc quyền giữa kiểm duyệt viên và quản trị viên (`moderator_admin.rs`)**: Xác minh chỉ tài khoản `admin` mới có quyền thay đổi vai trò giữa `user` và `moderator`, từ chối mọi yêu cầu nâng cấp lên `admin` qua API (`CannotAssignAdminRole`) và chặn thao tác tự thay đổi vai trò của chính mình.
* **Kiểm tra trạng thái hạn chế tài khoản**: Xác nhận hiệu lực chặn toàn bộ truy cập đối với tài khoản bị khóa (`banned`) và chặn các phương thức ghi đối với tài khoản đang bị cấm tương tác có thời hạn (`muted_until`).



## Tính chất kỹ thuật

* **Thiết lập vai trò trực tiếp trên cơ sở dữ liệu thử nghiệm**: Sử dụng các hàm tiện ích `set_role_in_db` và `set_status_in_db` từ `tests/common/mod.rs` để gán trực tiếp cột `role` và `status` trong PostgreSQL cho từng cặp tài khoản thử nghiệm trước khi gửi yêu cầu HTTP.


* **Tổ chức kịch bản theo ma trận tương tác**: Chia tách các tệp kiểm thử theo từng cặp chủ thể thực hiện và đối tượng chịu tác động, giúp kiểm chứng rõ ràng cả trường hợp được phép thực thi lẫn trường hợp bị từ chối quyền truy cập.


* **Tự động cô lập và dọn dẹp dữ liệu**: Mỗi kịch bản khởi tạo các tài khoản độc lập qua `register_and_login()` và tự động xóa sạch dữ liệu khỏi PostgreSQL thông qua trait `Drop` của `TestUser` ngay khi kết thúc.
