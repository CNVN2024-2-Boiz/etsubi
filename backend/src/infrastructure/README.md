# Lớp hạ tầng (`src/infrastructure/`)

Thư mục `src/infrastructure/` chứa các bản triển khai cụ thể cho những giao diện lưu trữ (`Repository`) và dịch vụ bên ngoài được định nghĩa ở lớp `domains/`, kết nối ứng dụng với cơ sở dữ liệu PostgreSQL, cơ chế kiểm soát truy cập HTTP và các thư viện hỗ trợ bên ngoài.

## Cấu trúc các thành phần

```text
src/infrastructure/
├── database/      # Triển khai truy vấn PostgreSQL bằng Diesel, ánh xạ mô hình entities/relations và schema.rs
├── helper/        # Các công cụ hỗ trợ: xác thực (JWT, Argon2), nhận diện ngôn ngữ và dịch thuật (DeepSeek, Gemini)
├── middleware.rs  # Middleware xác thực người dùng, kiểm tra phiên token và trạng thái tài khoản trên HTTP
└── mod.rs         # Khai báo và xuất các module con của lớp hạ tầng

```

## Tính năng và nhiệm vụ chính

* **Truy xuất và lưu trữ dữ liệu (`database/`)**:
* Cung cấp các bản triển khai `Repository` cho toàn bộ miền nghiệp vụ: xác thực, người dùng, bài viết, bình luận, thẻ, lưu bài, biểu cảm, theo dõi, thông báo và bản dịch lưu trữ.


* Tách biệt mô hình ánh xạ bảng thành nhóm thực thể chính (`entities/`) và nhóm bảng trung gian quan hệ (`relations/`) dựa trên tệp lược đồ `schema.rs`.




* **Tiện ích bảo mật và dịch thuật (`helper/`)**:
* Nhóm `auth/`: Băm và đối chiếu mật khẩu bằng thuật toán Argon2, đồng thời tạo và giải mã chuỗi JWT phục vụ xác thực phiên làm việc.


* Nhóm `translation/`: Nhận diện ngôn ngữ nội dung bài viết và bình luận qua `whichlang`, xây dựng prompt JSON và gửi yêu cầu bất đồng bộ qua `reqwest` tới nhà cung cấp dịch thuật DeepSeek hoặc Gemini.




* **Kiểm soát truy cập HTTP (`middleware.rs`)**:
* Trích xuất và xác minh mã JWT từ yêu cầu HTTP gửi lên.


* Đối chiếu giá trị `token_version` và trạng thái tài khoản (`banned`, `muted_until`) để quyết định quyền tiếp tục thực thi yêu cầu.





## Tính chất kỹ thuật

* **Tách biệt truy vấn đồng bộ với luồng bất đồng bộ**: Thư viện `diesel` thực thi các câu lệnh SQL đồng bộ trên nhóm kết nối `r2d2`; các thao tác cơ sở dữ liệu được bọc qua `actix_web::web::block` để không làm nghẽn các luồng xử lý mạng của `actix-web`.


* **An toàn kiểu dữ liệu ở tầng truy vấn**: Toàn bộ câu lệnh SQL được xây dựng qua DSL kiểm tra kiểu lúc biên dịch của `diesel`, đối chiếu trực tiếp cấu trúc cột trong `schema.rs` với các cấu trúc ánh xạ trong `models/`.


* **Trừu tượng hóa nhà cung cấp dịch thuật**: Thành phần `translation/` đóng gói giao tiếp HTTP, định dạng gói tin JSON, xử lý mã lỗi mạng và giới hạn thời gian chờ (`timeout`), cho phép chuyển đổi giữa DeepSeek và Gemini thông qua cấu hình biến môi trường.


* **Chuyển đổi lỗi hạ tầng sang lỗi nghiệp vụ**: Các lỗi phát sinh từ PostgreSQL, giải mã token hoặc gọi API bên ngoài được ánh xạ về các kiểu lỗi chuẩn của từng miền trong `domains/`.
