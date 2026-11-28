# Kịch bản kiểm thử nhanh API (`scripts/`)

Thư mục `scripts/` chứa các tệp kịch bản dòng lệnh dùng để kiểm tra nhanh hoạt động của các endpoint RESTful, luồng xác thực và thao tác dữ liệu trên máy chủ Etsubi đang chạy cục bộ hoặc trong container.

## Tính năng và nhiệm vụ chính

* **Kiểm tra trạng thái máy chủ**: Gửi yêu cầu tới điểm kiểm tra `/api/v1/health` để xác nhận tiến trình máy chủ HTTP và kết nối cơ sở dữ liệu đang hoạt động bình thường.
* **Kiểm thử luồng xác thực người dùng**: Thực hiện tuần tự các bước đăng ký tài khoản mới, đăng nhập lấy chuỗi JWT và tự động đính kèm mã xác thực vào header `Authorization: Bearer <token>` cho các yêu cầu tiếp theo.
* **Thao tác dữ liệu nghiệp vụ mẫu**: Gửi các gói tin JSON mẫu để kiểm tra khả năng tạo bài viết, bình luận, gắn thẻ, thả biểu cảm, theo dõi người dùng và truy xuất danh sách dữ liệu trả về từ API.

## Tính chất kỹ thuật

* **Giao tiếp HTTP trực tiếp qua dòng lệnh**: Sử dụng công cụ `curl` để gửi các phương thức HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) kèm tiêu đề `Content-Type: application/json` tới địa chỉ máy chủ cấu hình qua biến môi trường hoặc giá trị mặc định (`http://localhost:11432`).
* **Trích xuất và xử lý phản hồi JSON**: Kết hợp công cụ `jq` để phân tích cú pháp dữ liệu trả về từ máy chủ, trích xuất mã JWT hoặc định danh tài nguyên (`id`) làm tham số đầu vào cho các bước kiểm thử kế tiếp trong cùng kịch bản.
* **Tách biệt với mã nguồn biên dịch**: Các kịch bản shell chạy độc lập bên ngoài trình biên dịch Rust, cho phép kiểm tra nhanh hành vi thực tế của API sau khi khởi động server hoặc triển khai container mà không cần biên dịch lại bộ kiểm thử.

## Cách sử dụng

1. Đảm bảo máy chủ Etsubi đang hoạt động và hệ thống đã cài đặt sẵn `curl` cùng `jq`.
2. Cấp quyền thực thi và chạy kịch bản từ thư mục gốc của dự án:
```bash
chmod +x scripts/*.sh
./scripts/<ten_kich_ban>.sh

```
