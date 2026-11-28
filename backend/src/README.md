# Kiến trúc mã nguồn (`src/`)

Thư mục `src/` chứa toàn bộ mã nguồn của ứng dụng backend Etsubi, được tổ chức theo mô hình phân lớp nhằm tách biệt logic nghiệp vụ khỏi chi tiết hạ tầng và giao thức truyền tải HTTP.

## Cấu trúc các thành phần

```text
src/
├── bootstrap/       # Khởi tạo cấu hình, trạng thái dùng chung (AppState), middleware và lắp ráp ứng dụng
├── domains/         # Các thực thể, quy tắc nghiệp vụ, mô hình dữ liệu và giao diện (trait) cho từng phân hệ
├── infrastructure/  # Triển khai truy vấn PostgreSQL (Diesel), bảo mật (JWT, Argon2) và tích hợp dịch vụ bên ngoài
├── presentation/    # Các endpoint HTTP (handlers), bộ trích xuất xác thực, kiểm tra quyền và định nghĩa OpenAPI
├── lib.rs           # Khai báo và xuất các module dùng chung cho binary chính và bộ kiểm thử tích hợp
└── main.rs          # Điểm vào của tiến trình, nạp biến môi trường, thiết lập ghi nhật ký và khởi chạy server

```

## Tính chất kỹ thuật từng lớp

* **Điểm khởi chạy (`main.rs` và `lib.rs`)**:
* `main.rs` chịu trách nhiệm nạp cấu hình từ tệp `.env` thông qua `dotenvy`, khởi tạo hệ thống ghi nhật ký có cấu trúc (`tracing-subscriber`) và chuyển quyền điều khiển cho lớp `bootstrap`.
* `lib.rs` đóng gói toàn bộ cấu trúc thư viện của ứng dụng, cho phép mã nguồn được tái sử dụng trực tiếp trong các bài kiểm thử tích hợp tại thư mục `tests/`.


* **Lớp khởi tạo (`bootstrap/`)**:
* Đọc và kiểm tra tính hợp lệ của các biến môi trường thành đối tượng cấu hình tập trung.
* Khởi tạo nhóm kết nối cơ sở dữ liệu PostgreSQL (`r2d2`), dịch vụ dịch thuật và đóng gói vào `AppState` để chia sẻ an toàn giữa các luồng xử lý của `actix-web`.
* Cấu hình chuỗi middleware gồm giới hạn tần suất yêu cầu (`actix-governor`), kiểm soát nguồn gốc truy cập (`actix-cors`), ghi nhật ký HTTP và gắn giao diện Swagger UI cùng các nhóm định tuyến `/api/v1`.


* **Lớp nghiệp vụ (`domains/`)**:
* Chia tách độc lập theo từng miền chức năng: xác thực, người dùng, bài viết, bình luận, tương tác (thích, lưu bài, theo dõi), thẻ, thông báo và dịch thuật.
* Định nghĩa các cấu trúc dữ liệu nghiệp vụ, quy tắc kiểm tra tính hợp lệ và các giao diện (`trait`) trừu tượng hóa việc lưu trữ dữ liệu mà không phụ thuộc vào thư viện cơ sở dữ liệu hay framework web.


* **Lớp hạ tầng (`infrastructure/`)**:
* Cung cấp các bản triển khai cụ thể cho các giao diện lưu trữ của lớp `domains` bằng ORM `diesel` và PostgreSQL, kèm tệp `schema.rs` ánh xạ trực tiếp cấu trúc bảng.
* Đóng gói các tác vụ xử lý mật khẩu bằng thuật toán Argon2, tạo và xác thực mã JWT (`HS256`), nhận diện ngôn ngữ văn bản qua `whichlang` và giao tiếp HTTP tới các nhà cung cấp mô hình ngôn ngữ phục vụ dịch thuật.


* **Lớp trình bày (`presentation/`)**:
* Tiếp nhận các yêu cầu HTTP qua `actix-web`, trích xuất tham số truy vấn, đường dẫn và dữ liệu JSON.
* Thực thi cơ chế xác thực người dùng qua header `Authorization`, kiểm tra vai trò quản trị (`moderator`, `admin`) và trạng thái tài khoản (`banned`, `muted_until`) trước khi gọi xuống lớp nghiệp vụ.
* Chuyển đổi các loại lỗi nội bộ thành phản hồi JSON chuẩn hóa kèm mã trạng thái HTTP tương ứng và chú thích tài liệu OpenAPI (`utoipa`).
