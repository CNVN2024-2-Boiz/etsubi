# Cấu hình khởi chạy container (`docker/`)

Thư mục `docker/` chứa các tệp kịch bản điều phối quá trình khởi động của ứng dụng Etsubi bên trong môi trường container, phối hợp cùng tệp `Dockerfile` ở thư mục gốc.

## Cấu trúc các thành phần

```text
docker/
└── entrypoint.sh  # Kịch bản khởi chạy chính của container, chuẩn bị cơ sở dữ liệu và bàn giao tiến trình cho máy chủ HTTP

```

## Tính năng và nhiệm vụ chính

* **Kiểm tra trạng thái sẵn sàng của cơ sở dữ liệu**: Sử dụng công cụ dòng lệnh `pg_isready` để thăm dò kết nối tới máy chủ PostgreSQL theo thông số cấu hình (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`), đảm bảo cơ sở dữ liệu đã mở cổng tiếp nhận kết nối trước khi ứng dụng thao tác dữ liệu.
* **Tự động cập nhật lược đồ cơ sở dữ liệu**: Gọi lệnh `diesel migration run` để áp dụng toàn bộ các bản cập nhật cấu trúc bảng mới nhất từ thư mục `migrations/` vào PostgreSQL ngay trước khi ứng dụng hoạt động.
* **Khởi chạy tiến trình máy chủ ứng dụng**: Chuyển quyền điều khiển sang tệp thực thi đã biên dịch của Etsubi để bắt đầu lắng nghe các yêu cầu HTTP trên địa chỉ và cổng đã cấu hình.

## Tính chất kỹ thuật

* **Chế độ thực thi nghiêm ngặt (`set -e`)**: Kịch bản shell dừng ngay lập tức nếu bất kỳ bước chuẩn bị nào (như kết nối cơ sở dữ liệu thất bại hoặc chạy migration gặp lỗi) trả về mã thoát khác 0, giúp hệ thống điều phối container phát hiện sớm sự cố khởi động.
* **Thay thế tiến trình bằng `exec**`: Lệnh cuối cùng sử dụng `exec` để thay thế tiến trình shell bằng tiến trình nhị phân của ứng dụng Rust, giúp ứng dụng nhận trực tiếp các tín hiệu hệ điều hành (như `SIGTERM`, `SIGINT`) từ `tini` để đóng kết nối và dừng hoạt động an toàn.
* **Vận hành dưới quyền hạn tối thiểu**: Toàn bộ kịch bản trong `docker/` được thực thi dưới tài khoản hệ thống không đặc quyền (`etsubi`) đã thiết lập trong `Dockerfile`, tách biệt khỏi quyền quản trị `root` của hệ điều hành container.

