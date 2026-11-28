# Kiểm thử tích hợp (`tests/`)

Thư mục `tests/` chứa bộ kiểm thử tích hợp của hệ thống Etsubi, thực hiện kiểm tra toàn bộ luồng hoạt động của ứng dụng từ giao tiếp HTTP, xác thực quyền truy cập cho tới truy vấn cơ sở dữ liệu PostgreSQL thực tế.

## Cấu trúc các thành phần

```text
tests/
├── common/      # Tiện ích dùng chung: khởi tạo máy chủ HTTP thử nghiệm, tạo cơ sở dữ liệu độc lập và cung cấp hàm gọi API mẫu
└── *_test.rs    # Các bộ kịch bản kiểm thử tách biệt theo từng phân hệ nghiệp vụ (xác thực, bài viết, bình luận, tương tác, thông báo, quản trị)

```

## Tính năng và phạm vi kiểm thử

* **Luồng xác thực và phiên làm việc**: Kiểm tra đăng ký tài khoản, đăng nhập nhận mã JWT, truy cập thông tin cá nhân và xác minh cơ chế vô hiệu hóa token sau khi đăng xuất toàn cục.
* **Phân quyền và kiểm soát trạng thái tài khoản**: Xác nhận hành vi chặn truy cập với tài khoản bị khóa (`banned`), từ chối thao tác ghi đối với tài khoản bị cấm tương tác có thời hạn (`muted_until`) và kiểm tra đặc quyền của vai trò `moderator`, `admin`.
* **Vòng đời bài viết và bình luận**: Kiểm thử tạo, cập nhật, xóa mềm (`deleted_at`), khôi phục nội dung, bình luận lồng nhau nhiều cấp (`parent_id`) và quy tắc chặn bình luận khi bài viết đã bị khóa.
* **Tương tác, tìm kiếm và thông báo**: Kiểm tra thả biểu cảm, lưu bài viết, theo dõi người dùng, lọc bài viết theo nhiều thẻ kết hợp từ khóa và xác nhận thông báo tự động phát sinh khi có tương tác hoặc nhắc tên.

## Tính chất kỹ thuật

* **Kiểm thử toàn luồng qua HTTP thực tế**: Mỗi kịch bản khởi chạy một thực thể máy chủ `actix-web` trên cổng mạng ngẫu nhiên của hệ điều hành và gửi yêu cầu HTTP thật thông qua thư viện `reqwest` (kèm macro `#[tokio::test]`), tái hiện chính xác quá trình tuần tự hóa JSON và xử lý middleware.
* **Cô lập dữ liệu giữa các bài kiểm thử**: Hạ tầng dùng chung trong `common/` tạo cơ sở dữ liệu riêng biệt hoặc làm sạch dữ liệu và chạy đầy đủ các tệp `migrations/` trước khi thực thi, đảm bảo các ca kiểm thử chạy độc lập và không ảnh hưởng lẫn nhau.
* **Tái sử dụng mã nguồn ứng dụng**: Bộ kiểm thử liên kết trực tiếp với crate thư viện của dự án thông qua `src/lib.rs`, giúp kiểm chứng chính xác cấu hình lắp ráp ứng dụng thực tế mà không cần sao chép mã nguồn.
