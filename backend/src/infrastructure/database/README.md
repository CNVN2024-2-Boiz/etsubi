# Tầng lưu trữ và truy xuất cơ sở dữ liệu (`src/infrastructure/database/`)

Thư mục `src/infrastructure/database/` chứa toàn bộ mã nguồn giao tiếp với cơ sở dữ liệu PostgreSQL của hệ thống Etsubi, triển khai các giao diện lưu trữ (`Repository`) được định nghĩa tại lớp `domains/`.

## Cấu trúc các thành phần

```text
src/infrastructure/database/
├── repositories/  # Các bản triển khai truy vấn SQL chi tiết theo từng miền nghiệp vụ
├── connection.rs  # Khởi tạo nhóm kết nối r2d2::Pool và kiểu bí danh DbPool
├── models.rs      # Các cấu trúc dữ liệu ánh xạ trực tiếp với từng bảng trong PostgreSQL
└── schema.rs      # Định nghĩa cấu trúc bảng và kiểu cột do Diesel CLI tự động sinh

```

## Tính năng và nhiệm vụ chính

* **Quản lý nhóm kết nối (`connection.rs`)**: Thiết lập nhóm kết nối PostgreSQL (`r2d2::Pool<ConnectionManager<PgConnection>>`) với giới hạn số lượng kết nối đồng thời, cung cấp kết nối sẵn có cho các tác vụ truy vấn mà không phải mở lại kết nối TCP trên mỗi yêu cầu.
* **Ánh xạ dữ liệu quan hệ (`schema.rs`, `models.rs`)**:
* Đồng bộ cấu trúc các bảng (`users`, `posts`, `comments`, `tags`, `post_tags`, `reactions`, `bookmarks`, `follows`, `notifications`, `translations`) thông qua macro `diesel::table!`.
* Chuyển đổi hai chiều giữa bản ghi cơ sở dữ liệu và thực thể nghiệp vụ bằng các derive macro `Queryable`, `Selectable`, `Insertable` và `AsChangeset`.


* **Triển khai truy vấn nghiệp vụ (`repositories/`)**:
* Thực thi các thao tác tạo, đọc, cập nhật, xóa mềm (`deleted_at`) và khôi phục dữ liệu cho bài viết, bình luận và tài khoản người dùng.
* Xây dựng các truy vấn tìm kiếm bài viết theo từ khóa (`ILIKE`) kết hợp lọc đồng thời nhiều thẻ thông qua phép nối bảng `post_tags`, cùng các bộ lọc danh sách bài viết mới nhất, nổi bật, phổ biến, hỏi đáp và bài viết từ người đang theo dõi.
* Đảm bảo tính nhất quán dữ liệu thông qua các giao dịch cơ sở dữ liệu (`connection.transaction`) khi thao tác đồng thời trên nhiều bảng (như tạo bài viết kèm danh sách thẻ, cập nhật trạng thái tương tác hoặc tăng `token_version`).



## Tính chất kỹ thuật

* **Kiểm tra kiểu truy vấn lúc biên dịch**: Toàn bộ câu lệnh chọn cột, lọc điều kiện, nối bảng và gán giá trị đều sử dụng DSL tĩnh của `diesel`, giúp phát hiện sai lệch kiểu dữ liệu hoặc tên cột ngay trong quá trình biên dịch Rust.
* **Thực thi đồng bộ tách biệt khỏi luồng mạng**: Các phương thức truy vấn của `diesel` chạy đồng bộ trên từng kết nối lấy từ `r2d2::Pool` và được gọi bên trong `actix_web::web::block` từ lớp trình bày, giữ cho các worker thread xử lý HTTP không bị nghẽn bởi thao tác vào ra đĩa và mạng của cơ sở dữ liệu.
* **Xử lý lỗi chuẩn hóa**: Mọi lỗi phát sinh từ PostgreSQL hoặc `r2d2` (như vi phạm ràng buộc duy nhất, lỗi khóa ngoại, không tìm thấy dòng dữ liệu) đều được ánh xạ trực tiếp về kiểu lỗi nghiệp vụ thống nhất của lớp `domains/`.
