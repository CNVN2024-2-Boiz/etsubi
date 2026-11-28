# Miền nghiệp vụ lưu bài viết (`src/domains/bookmark/`)

Thư mục `src/domains/bookmark/` định nghĩa mô hình dữ liệu, các quy tắc kiểm tra nghiệp vụ và giao diện lưu trữ phục vụ tính năng đánh dấu, lưu trữ và truy xuất danh sách bài viết yêu thích của người dùng trong hệ thống Etsubi.

## Cấu trúc các thành phần

```text
src/domains/bookmark/
├── error.rs       # Định nghĩa các biến thể lỗi lưu bài viết và ánh xạ sang mã trạng thái HTTP
├── mod.rs         # Khai báo và xuất các module con của phân hệ lưu bài viết
├── repository.rs  # Khai báo trait trừu tượng hóa thao tác truy vấn và cập nhật bảng bookmarks
└── service.rs     # Cài đặt logic nghiệp vụ thêm, xóa, kiểm tra trạng thái và liệt kê bài viết đã lưu

```

## Tính năng và quy tắc nghiệp vụ chính

* **Lưu bài viết (`add_bookmark`)**:
* Kiểm tra sự tồn tại và trạng thái khả dụng của bài viết thông qua kho lưu trữ bài viết trước khi cho phép đánh dấu lưu.
* Đảm bảo mỗi người dùng chỉ lưu một bài viết duy nhất một lần, trả về lỗi xung đột nếu bài viết đã nằm trong danh sách lưu trước đó.


* **Bỏ lưu bài viết (`remove_bookmark`)**:
* Xóa bản ghi liên kết giữa người dùng và bài viết khỏi danh sách lưu trữ, báo lỗi không tìm thấy nếu người dùng chưa từng lưu bài viết đó.


* **Truy vấn và kiểm tra trạng thái lưu**:
* Kiểm tra nhanh một bài viết cụ thể đã được người dùng hiện tại lưu hay chưa.
* Lấy danh sách toàn bộ bài viết đã lưu của người dùng kèm thời điểm lưu (`bookmarked_at`).





## Tính chất kỹ thuật

* **Phối hợp liên miền qua giao diện trừu tượng**: `BookmarkService` nhận đồng thời giao diện lưu trữ của miền lưu bài viết và miền bài viết (`PostRepository`), đảm bảo xác minh điều kiện bài viết tồn tại và chưa bị xóa mềm trước khi ghi nhận thao tác lưu.


* **Ràng buộc khóa chính kép ở tầng dữ liệu**: Mối quan hệ lưu bài viết được mô hình hóa bằng cặp khóa chính kết hợp `(user_id, post_id)` trong bảng `bookmarks`, ngăn chặn trùng lặp dữ liệu ở cả lớp nghiệp vụ lẫn cơ sở dữ liệu.


* **Chuẩn hóa phản hồi lỗi HTTP**: `BookmarkError` sử dụng `thiserror` và triển khai `ResponseError` của `actix-web` để tự động chuyển đổi các lỗi miền sang mã HTTP tương ứng (`404 Not Found` khi bài viết không khả dụng hoặc chưa được lưu, `409 Conflict` khi bài viết đã được lưu).
