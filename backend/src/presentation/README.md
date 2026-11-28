# Lớp trình bày và giao tiếp HTTP (`src/presentation/`)

Thư mục `src/presentation/` đóng vai trò là cổng giao tiếp bên ngoài của hệ thống Etsubi, chịu trách nhiệm tiếp nhận yêu cầu HTTP, kiểm soát quyền truy cập, điều phối xử lý tới các phân hệ nghiệp vụ và định dạng phản hồi JSON cho client.

## Cấu trúc các thành phần

```text
src/presentation/
├── extractors/  # Bộ trích xuất dữ liệu xác thực từ header HTTP, kiểm tra phiên làm việc và trạng thái tài khoản
├── handlers/    # Các hàm xử lý endpoint RESTful chia theo từng nhóm tài nguyên dưới tiền tố /api/v1
├── models/      # Các cấu trúc dữ liệu yêu cầu (Request DTO) và phản hồi (Response DTO) kèm kiểm tra đầu vào
├── error.rs     # Ánh xạ lỗi nghiệp vụ sang mã trạng thái HTTP và định dạng gói tin lỗi JSON thống nhất
└── openapi.rs   # Khai báo đặc tả OpenAPI 3.0 tập trung và cấu hình giao diện tài liệu Swagger UI

```

## Tính năng và nhiệm vụ chính

* **Xác thực và kiểm soát truy cập (`extractors/`)**:
* Trích xuất và xác minh chuỗi JWT từ header `Authorization: Bearer <token>` trên các tuyến đường yêu cầu đăng nhập.
* Đối chiếu giá trị `token_version` trong token với cơ sở dữ liệu để từ chối ngay các phiên đã đăng xuất toàn cục.
* Kiểm tra trạng thái tài khoản trước khi cho phép thực thi nghiệp vụ: từ chối toàn bộ truy cập đối với tài khoản bị khóa (`banned`), chặn các phương thức ghi (`POST`, `PUT`, `PATCH`, `DELETE`) đối với tài khoản đang bị cấm tương tác có thời hạn (`muted_until`), và xác minh vai trò quản trị (`moderator`, `admin`) trên các endpoint đặc quyền.


* **Định tuyến và xử lý yêu cầu (`handlers/`)**:
* Tổ chức các nhóm endpoint rõ ràng theo miền tài nguyên: xác thực (`/auth`), người dùng (`/users`, `/my`), bài viết (`/posts`), bình luận (`/comments`), tương tác (`/reactions`, `/bookmarks`, `/follows`), thẻ (`/tags`), thông báo (`/notifications`), quản trị (`/admin`) và kiểm tra trạng thái hệ thống (`/health`).
* Hỗ trợ phân tích tham số đường dẫn (`Path`), tham số truy vấn (`Query`) phục vụ lọc, tìm kiếm bài viết và giải tuần tự hóa thân yêu cầu JSON (`Json`).


* **Chuẩn hóa dữ liệu vào ra (`models/`)**:
* Tách biệt cấu trúc dữ liệu giao tiếp HTTP khỏi thực thể nội bộ của lớp `domains/`.
* Áp dụng quy tắc kiểm tra tính hợp lệ của dữ liệu đầu vào (độ dài tiêu đề, nội dung, định dạng email, mật khẩu) trước khi chuyển xuống tầng xử lý nghiệp vụ.


* **Xử lý lỗi và tài liệu API (`error.rs`, `openapi.rs`)**:
* Chuyển đổi tự động các biến thể lỗi nội bộ thành mã trạng thái HTTP tương ứng (`400`, `401`, `403`, `404`, `409`, `429`, `500`) với cấu trúc JSON nhất quán.
* Tự động sinh tài liệu đặc tả OpenAPI 3.0 thông qua macro của `utoipa`, gắn kèm lược đồ bảo mật Bearer JWT và phục vụ trực tiếp trên trình duyệt qua `/swagger-ui/`.



## Tính chất kỹ thuật

* **Trích xuất bảo mật khai báo qua trait `FromRequest**`: Cơ chế xác thực và phân quyền được đóng gói thành các kiểu dữ liệu tham số trong chữ ký hàm handler của `actix-web` (như người dùng hiện tại, người dùng tùy chọn, quản trị viên), giúp tự động thực thi kiểm tra trước khi hàm xử lý chạy mà không lặp lại mã kiểm tra thủ công.
* **Xử lý bất đồng bộ không chặn**: Các hàm handler hoạt động dưới dạng `async fn`, tiếp nhận trạng thái dùng chung qua `web::Data<AppState>` và phối hợp với các lệnh truy vấn cơ sở dữ liệu qua `web::block` để duy trì khả năng xử lý đồng thời nhiều kết nối.
* **Đồng bộ hóa mã nguồn và tài liệu đặc tả**: Nhờ tích hợp trực tiếp `utoipa` trên từng handler và cấu trúc DTO, tài liệu API tại `/swagger-ui/` luôn phản ánh chính xác kiểu dữ liệu, tham số và mã phản hồi thực tế của mã nguồn.
