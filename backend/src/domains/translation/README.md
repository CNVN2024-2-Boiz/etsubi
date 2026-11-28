# Miền nghiệp vụ dịch thuật tự động (`src/domains/translation/`)

Thư mục `src/domains/translation/` định nghĩa mô hình dữ liệu, các quy tắc kiểm tra nghiệp vụ, lỗi miền và giao diện lưu trữ phục vụ tính năng chuyển ngữ bài viết và bình luận sang ngôn ngữ cài đặt của người dùng trong hệ thống Etsubi.

## Cấu trúc các thành phần

```text
src/domains/translation/
├── error.rs       # Định nghĩa các biến thể lỗi dịch thuật và ánh xạ sang mã trạng thái HTTP
├── mod.rs         # Khai báo và xuất các module con của phân hệ dịch thuật
├── repository.rs  # Khai báo trait trừu tượng hóa thao tác lưu trữ bản dịch trong PostgreSQL
└── service.rs     # Cài đặt logic điều phối dịch bài viết, bình luận và tái sử dụng bản dịch đã lưu[cite: 2]

```

## Tính năng và quy tắc nghiệp vụ chính

* **Dịch bài viết và bình luận theo ngôn ngữ người dùng**:
* Xác định ngôn ngữ đích dựa trên cấu hình ngôn ngữ ưu tiên (`language`) của tài khoản người dùng đang yêu cầu.


* Kiểm tra sự tồn tại của bài viết, bình luận và tài khoản yêu cầu trước khi thực hiện chuyển ngữ; trả về nguyên bản nội dung nếu ngôn ngữ gốc đã trùng với ngôn ngữ đích.


* Giới hạn độ dài văn bản đầu vào (`ContentTooLong`) nhằm kiểm soát kích thước dữ liệu gửi sang dịch vụ mô hình ngôn ngữ bên ngoài.




* **Lưu trữ và tái sử dụng bản dịch**:
* Truy vấn bản dịch đã lưu trong hai bảng `post_translation` (gồm tiêu đề và nội dung) và `comment_translation` (gồm nội dung bình luận) theo cặp khóa chính `(original_id, language)` trước khi gọi API bên ngoài.


* Lưu trữ kết quả dịch mới vào PostgreSQL để phục vụ các lần truy cập tiếp theo cho cùng cặp nội dung và ngôn ngữ đích.


* Hỗ trợ đánh dấu xóa mềm (`deleted_at`) đối với các bản dịch khi nội dung gốc bị chỉnh sửa hoặc xóa.





## Tính chất kỹ thuật

* **Phối hợp liên miền qua giao diện trừu tượng**: `TranslationService` kết hợp đồng thời `UserRepository`, `PostRepository`, `CommentRepository`, `TranslationRepository` và giao diện `TranslationClient`, tách biệt hoàn toàn logic điều phối nghiệp vụ khỏi chi tiết gọi API của từng nhà cung cấp dịch thuật.


* **Cơ chế kích hoạt tùy chọn theo cấu hình**: `TranslationClient` được truyền vào dưới dạng tùy chọn (`Option<Arc<dyn TranslationClient>>`); khi hệ thống chưa cấu hình khóa API dịch thuật, dịch vụ tự động trả về lỗi `NotConfigured` (`503 Service Unavailable`) mà không ảnh hưởng tới hoạt động khởi chạy của toàn bộ ứng dụng.


* **Chuẩn hóa phản hồi lỗi hạ tầng và dịch vụ ngoài**: `TranslationError` sử dụng `thiserror` và triển khai `ResponseError` của `actix-web` để phân loại rõ ràng các sự cố từ nhà cung cấp bên ngoài sang mã HTTP tương ứng (`400 Bad Request` khi nội dung vượt quá giới hạn ký tự, `404 Not Found` khi không tìm thấy bài viết, bình luận hoặc người dùng, `502 Bad Gateway` khi phản hồi từ dịch vụ ngoài sai định dạng JSON, `503 Service Unavailable` khi chưa cấu hình hoặc mất kết nối, `504 Gateway Timeout` khi quá thời gian chờ).
