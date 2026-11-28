# Miền nghiệp vụ thông báo (`src/domains/notification/`)

Thư mục `src/domains/notification/` định nghĩa các mô hình dữ liệu, quy tắc phát sinh thông báo, lỗi miền và giao diện lưu trữ phục vụ hệ thống thông báo sự kiện trong ứng dụng Etsubi.

## Cấu trúc các thành phần

```text
src/domains/notification/
├── error.rs       # Định nghĩa các biến thể lỗi thông báo và ánh xạ sang mã trạng thái HTTP
├── mod.rs         # Khai báo và xuất các module con của phân hệ thông báo
├── repository.rs  # Khai báo trait trừu tượng hóa thao tác truy vấn và cập nhật bảng notifications
└── service.rs     # Cài đặt logic nghiệp vụ tạo, gửi hàng loạt, đọc và xóa thông báo[cite: 2]

```

## Tính năng và quy tắc nghiệp vụ chính

* **Tạo thông báo theo sự kiện và quản trị (`create_notification`)**:
* Hỗ trợ khởi tạo thông báo gắn với người nhận (`user_id`), người thực hiện hành động tùy chọn (`actor_id`), loại thông báo (`kind`), nội dung hiển thị (`message`) và đường dẫn điều hướng (`link`).
* Kiểm tra tính hợp lệ của loại thông báo, dữ liệu ngữ cảnh đi kèm và định dạng đường dẫn nội bộ (bắt đầu bằng ký tự `/` và dài tối đa 500 ký tự).
* Ngăn chặn việc người dùng tự gửi thông báo cho chính mình (`CannotNotifySelf`) và yêu cầu quyền quản trị (`moderator` hoặc `admin`) đối với các loại thông báo hệ thống.


* **Thông báo nhắc tên và phát tới người theo dõi**:
* Xử lý danh sách người dùng được nhắc tên (`create_mentions`) trong nội dung bài viết hoặc bình luận để phát sinh thông báo tương ứng.
* Gửi thông báo hàng loạt (`notify_followers`) tới toàn bộ tài khoản đang theo dõi tác giả khi có bài viết mới được đăng tải.


* **Quản lý hộp thư thông báo cá nhân**:
* Truy xuất danh sách thông báo của người dùng hiện tại và thống kê số lượng thông báo chưa đọc (`is_readed = false`).
* Đánh dấu đã đọc đối với từng thông báo riêng lẻ, đánh dấu đã đọc toàn bộ hoặc xóa thông báo thuộc quyền sở hữu của người dùng.





## Tính chất kỹ thuật

* **Phối hợp liên miền qua giao diện trừu tượng**: `NotificationService` kết hợp đồng thời `NotificationRepository`, `UserRepository`, `PostRepository` và `FollowRepository` để xác minh sự tồn tại của người nhận, bài viết liên quan và truy xuất danh sách người theo dõi trước khi ghi thông báo.


* **Kiểm soát quyền sở hữu thông báo**: Mọi thao tác đánh dấu đã đọc hoặc xóa thông báo đều đối chiếu định danh người sở hữu (`user_id`), trả về lỗi từ chối truy cập nếu người dùng thao tác trên thông báo của tài khoản khác.
* **Chuẩn hóa phản hồi lỗi HTTP**: `NotificationError` sử dụng `thiserror` và triển khai `ResponseError` của `actix-web` để ánh xạ trực tiếp các lỗi miền sang mã trạng thái HTTP tương ứng (`400 Bad Request` khi sai loại thông báo, thiếu ngữ cảnh, sai định dạng đường dẫn hoặc tự gửi cho chính mình; `403 Forbidden` khi không đủ quyền hạn; `404 Not Found` khi không tìm thấy thông báo, người dùng hoặc bài viết).
