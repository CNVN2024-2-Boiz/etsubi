# Etsubi Backend

RESTful API backend cho nền tảng diễn đàn đa ngôn ngữ Etsubi, viết bằng Rust (`actix-web`), ORM `diesel` và cơ sở dữ liệu PostgreSQL.

## Tính năng hệ thống

* **Xác thực và quản lý phiên**: Đăng ký, đăng nhập bằng JWT (`HS256`), băm mật khẩu bằng Argon2, đăng xuất và vô hiệu hóa toàn bộ token cũ thông qua cơ chế tăng `token_version`.
* **Người dùng và phân quyền**: Quản lý hồ sơ cá nhân (`/my`), phân quyền 3 cấp (`user`, `moderator`, `admin`), khóa tài khoản (`banned`) và cấm tương tác có thời hạn (`muted_until`, chỉ cho phép đọc và chặn các phương thức ghi).
* **Bài viết và bình luận**: Tạo, đọc, cập nhật, xóa bài viết và bình luận phân cấp (`parent_id`), gắn tọa độ địa lý (`latitude`, `longitude`), khóa bình luận trên bài viết, xóa mềm (`deleted_at`) và khôi phục nội dung cho đội ngũ quản trị.
* **Tương tác và khám phá**:
* Gắn thẻ (`tags`) cố định cho bài viết.
* Thả biểu cảm (`reactions`), lưu bài viết (`bookmarks`), theo dõi người dùng (`follows`) và gợi ý người dùng nên theo dõi dựa trên số lượng người theo dõi.
* Tìm kiếm bài viết theo từ khóa (`ILIKE`) kết hợp lọc đồng thời nhiều thẻ, cùng các danh sách bài viết mới nhất, nổi bật, phổ biến, hỏi đáp (`question`) và bài viết từ người đang theo dõi.


* **Thông báo**: Tạo thông báo theo sự kiện (theo dõi, tương tác, bình luận, phản hồi, nhắc tên `@mention`, thông báo quản trị) và gửi thông báo hàng loạt tới người theo dõi khi có bài viết mới (`notify-followers`).
* **Đa ngôn ngữ và dịch tự động**: Nhận diện ngôn ngữ nội dung (`vi`, `en`, `ja`) qua `whichlang` và dịch bài viết, bình luận theo ngôn ngữ cài đặt của người dùng thông qua API mô hình ngôn ngữ (DeepSeek hoặc Gemini), lưu bản dịch trong PostgreSQL và tự động xóa bản lưu khi nội dung gốc bị chỉnh sửa hoặc xóa.
* **Tài liệu API**: Tích hợp OpenAPI 3.0 và giao diện Swagger UI tại `/swagger-ui/`.

## Cấu trúc thư mục

```text
.
├── docker/         # Script entrypoint khởi chạy container (kiểm tra kết nối cơ sở dữ liệu qua pg_isready, chạy migration, khởi động server)
├── migrations/     # Các tệp SQL (up.sql, down.sql) quản lý phiên bản lược đồ PostgreSQL thông qua Diesel CLI
├── scripts/        # Các shell script dùng curl và jq để kiểm thử nhanh luồng xác thực và thao tác dữ liệu
├── src/            # Mã nguồn chính tổ chức theo kiến trúc phân lớp (bootstrap, domains, infrastructure, presentation)
├── tests/          # Bộ kiểm thử tích hợp khởi chạy HTTP server thật và kiểm thử toàn luồng qua reqwest
├── default.nix     # Định nghĩa môi trường phát triển trên Nix (Rust toolchain, libpq, clang, lld)
└── Dockerfile      # Quy trình đóng gói nhiều giai đoạn tách biệt bước biên dịch binary và môi trường chạy Debian slim

```

* **Xử lý mạng và định tuyến**: `actix-web` xử lý bất đồng bộ, tích hợp giới hạn tần suất truy cập (`actix-governor`), cấu hình CORS (`actix-cors`) và ghi nhật ký có cấu trúc (`tracing`).
* **Truy cập dữ liệu**: `diesel` kết hợp nhóm kết nối `r2d2` giao tiếp với PostgreSQL; các tác vụ cơ sở dữ liệu đồng bộ được bọc trong `web::block` để không làm nghẽn luồng xử lý của Actix.
* **Đóng gói và vận hành**: Container chạy dưới tài khoản không đặc quyền (`etsubi`), quản lý tiến trình bằng `tini` và kiểm tra trạng thái hoạt động qua endpoint `/api/v1/health`.
