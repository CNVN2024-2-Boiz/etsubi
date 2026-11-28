# Miền nghiệp vụ theo dõi người dùng (`src/domains/follow/`)

Thư mục `src/domains/follow/` định nghĩa các quy tắc nghiệp vụ, lỗi miền và giao diện lưu trữ phục vụ tính năng thiết lập, hủy bỏ và truy vấn quan hệ theo dõi giữa các tài khoản trong hệ thống Etsubi.

## Cấu trúc các thành phần

```text
src/domains/follow/
├── error.rs       # Định nghĩa các biến thể lỗi theo dõi và ánh xạ sang mã trạng thái HTTP
├── mod.rs         # Khai báo và xuất các module con của phân hệ theo dõi
├── repository.rs  # Khai báo trait trừu tượng hóa thao tác truy vấn và cập nhật bảng users_follows
└── service.rs     # Cài đặt logic nghiệp vụ theo dõi, hủy theo dõi và liệt kê danh sách liên kết

```

## Tính năng và quy tắc nghiệp vụ chính

* **Theo dõi người dùng (`follow_user`)**:
* Ngăn chặn người dùng tự theo dõi chính tài khoản của mình (`CannotFollowSelf`).
* Xác minh tài khoản mục tiêu tồn tại trong hệ thống thông qua kho lưu trữ người dùng trước khi tạo liên kết theo dõi.
* Đảm bảo tính duy nhất của mối quan hệ theo dõi giữa hai tài khoản, trả về lỗi xung đột nếu đã theo dõi trước đó.


* **Hủy theo dõi (`unfollow_user`)**:
* Xóa bản ghi liên kết khỏi bảng `users_follows` và trả về lỗi xung đột nếu hai người dùng hiện chưa có quan hệ theo dõi.


* **Truy vấn danh sách và trạng thái theo dõi**:
* Lấy danh sách người đang theo dõi (`followers`) và danh sách tài khoản mà một người dùng đang theo dõi (`following`) kèm dấu thời gian `followed_at`.
* Kiểm tra trạng thái theo dõi hai chiều giữa người dùng hiện tại với một tài khoản bất kỳ.



## Tính chất kỹ thuật

* **Phối hợp liên miền qua giao diện trừu tượng**: `FollowService` kết hợp đồng thời `FollowRepository` và `UserRepository` để xác thực sự tồn tại của người dùng đích trước khi ghi nhận quan hệ theo dõi xuống tầng lưu trữ.
* **Mô hình hóa quan hệ nhiều-nhiều tự tham chiếu**: Quan hệ theo dõi được lưu trữ trong bảng `users_follows` với khóa chính kết hợp `(follower_id, following_id)` cùng trỏ về bảng `users`, đảm bảo không phát sinh bản ghi trùng lặp giữa cùng một cặp người dùng.
* **Chuẩn hóa phản hồi lỗi HTTP**: `FollowError` sử dụng `thiserror` và triển khai `ResponseError` của `actix-web` để chuyển đổi trực tiếp các lỗi nghiệp vụ sang mã trạng thái HTTP tương ứng (`400 Bad Request` khi tự theo dõi chính mình, `404 Not Found` khi không tìm thấy người dùng, `409 Conflict` khi trạng thái theo dõi bị trùng hoặc không tồn tại).
