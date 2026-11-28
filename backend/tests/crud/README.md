# Kiểm thử tích hợp luồng nghiệp vụ CRUD (`tests/crud/`)

Thư mục `tests/crud/` chứa các bộ kịch bản kiểm thử tích hợp xác minh toàn bộ vòng đời dữ liệu (tạo, đọc, cập nhật, xóa) và các quy tắc nghiệp vụ cốt lõi của từng phân hệ qua giao thức HTTP thực tế.

## Cấu trúc các thành phần

```text
tests/crud/
├── bookmark.rs             # Kiểm thử lưu bài viết, bỏ lưu, kiểm tra trạng thái và danh sách bài viết đã lưu
├── comment.rs              # Kiểm thử tạo bình luận, phản hồi đa cấp, chỉnh sửa, xóa mềm và khóa bình luận
├── follow.rs               # Kiểm thử theo dõi, hủy theo dõi, chặn tự theo dõi và liệt kê danh sách liên kết
├── mod.rs                  # Khai báo và xuất toàn bộ module kiểm thử CRUD
├── notification.rs         # Kiểm thử tạo thông báo, nhắc tên, đánh dấu đã đọc và xóa thông báo cá nhân
├── notification_fanout.rs  # Kiểm thử phát thông báo hàng loạt tới người theo dõi khi đăng bài viết mới
├── post.rs                 # Kiểm thử tạo, cập nhật, xóa mềm bài viết, tọa độ địa lý, tìm kiếm và bộ lọc danh sách
├── reaction.rs             # Kiểm thử thả, thay đổi, gỡ bỏ biểu cảm và thống kê số lượng theo bài viết
├── tag.rs                  # Kiểm thử truy xuất danh mục thẻ, gắn thẻ và gỡ thẻ khỏi bài viết
├── translation.rs          # Kiểm thử luồng dịch bài viết, bình luận và tái sử dụng bản dịch lưu trong PostgreSQL
└── user.rs                 # Kiểm thử cập nhật hồ sơ cá nhân, đổi mật khẩu, tự xóa tài khoản và kiểm tra trùng lặp[cite: 2]

```

## Tính năng và phạm vi kiểm thử

* **Xác minh vòng đời tài nguyên**: Kiểm tra đầy đủ chuỗi thao tác `POST`, `GET`, `PATCH`, `DELETE` cho từng đối tượng nghiệp vụ (người dùng, bài viết, bình luận, thẻ, lưu bài, biểu cảm, theo dõi, thông báo), đối chiếu mã trạng thái HTTP và cấu trúc JSON phản hồi.


* **Kiểm tra điều kiện biên và ràng buộc dữ liệu**: Xác nhận hệ thống từ chối các dữ liệu đầu vào không hợp lệ (tiêu đề hoặc nội dung rỗng, vượt quá giới hạn độ dài, tọa độ địa lý sai miền giá trị, tự theo dõi chính mình, trùng lặp bản ghi) với các mã lỗi `400 Bad Request`, `404 Not Found` và `409 Conflict`.


* **Kiểm tra tác vụ liên miền**: Xác minh cơ chế phát sinh thông báo khi có nhắc tên hoặc đăng bài mới (`notification_fanout.rs`), cơ chế khóa bình luận trên bài viết và khả năng lưu trữ bản dịch.



## Tính chất kỹ thuật

* **Tái sử dụng hạ tầng máy chủ thử nghiệm**: Mỗi tệp kiểm thử gọi `TestServer::start()` và `register_and_login()` từ `tests/common/mod.rs` để khởi chạy máy chủ HTTP cục bộ và cấp phát tài khoản thử nghiệm độc lập kèm mã JWT.


* **Tự động dọn dẹp dữ liệu sau kiểm thử**: Các tài khoản thử nghiệm được bọc trong cấu trúc `TestUser` triển khai trait `Drop`, tự động xóa người dùng và các bản ghi liên quan khỏi PostgreSQL ngay khi kết thúc mỗi hàm kiểm thử.


* **Xác thực đồng thời tầng HTTP và tầng lưu trữ**: Các ca kiểm thử gửi yêu cầu mạng thật qua `reqwest::blocking::Client` đi qua đầy đủ lớp trình bày, lớp nghiệp vụ và truy vấn trực tiếp trên PostgreSQL để đảm bảo tính nhất quán dữ liệu đầu cuối.
