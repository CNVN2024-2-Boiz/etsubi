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

## Tính năng và phạm vi kiểm thử

* **Bảo vệ các endpoint quản trị khỏi người dùng thông thường (`user_moderator.rs`, `user_admin.rs`)**: Xác nhận hệ thống trả về mã lỗi `403 Forbidden` khi tài khoản vai trò `user` thực hiện các thao tác kiểm duyệt bài viết, bình luận, khóa tài khoản, cấm tương tác hoặc thay đổi vai trò người dùng khác.
* **Kiểm soát phân cấp ngang hàng (`moderator_moderator.rs`)**: Kiểm tra quy tắc ngăn chặn tài khoản `moderator` chỉnh sửa trạng thái hoặc cấm tương tác đối với một `moderator` khác hay `admin` (`CannotModifyHigherRole`), đồng thời ngăn chặn tự khóa hoặc tự cấm tương tác chính mình.
* **Phân định đặc quyền giữa kiểm duyệt viên và quản trị viên (`moderator_admin.rs`)**: Xác minh chỉ tài khoản `admin` mới có quyền thay đổi vai trò giữa `user` và `moderator`, từ chối mọi yêu cầu nâng cấp lên `admin` qua API (`CannotAssignAdminRole`) và chặn thao tác tự thay đổi vai trò của chính mình.
* **Kiểm tra trạng thái hạn chế tài khoản**: Xác nhận hiệu lực chặn toàn bộ truy cập đối với tài khoản bị khóa (`banned`) và chặn các phương thức ghi đối với tài khoản đang bị cấm tương tác có thời hạn (`muted_until`).



## Tính chất kỹ thuật

* **Thiết lập vai trò trực tiếp trên cơ sở dữ liệu thử nghiệm**: Sử dụng các hàm tiện ích `set_role_in_db` và `set_status_in_db` từ `tests/common/mod.rs` để gán trực tiếp cột `role` và `status` trong PostgreSQL cho từng cặp tài khoản thử nghiệm trước khi gửi yêu cầu HTTP.


* **Tổ chức kịch bản theo ma trận tương tác**: Chia tách các tệp kiểm thử theo từng cặp chủ thể thực hiện và đối tượng chịu tác động, giúp kiểm chứng rõ ràng cả trường hợp được phép thực thi lẫn trường hợp bị từ chối quyền truy cập.


* **Tự động cô lập và dọn dẹp dữ liệu**: Mỗi kịch bản khởi tạo các tài khoản độc lập qua `register_and_login()` và tự động xóa sạch dữ liệu khỏi PostgreSQL thông qua trait `Drop` của `TestUser` ngay khi kết thúc.
