# Miền nghiệp vụ thẻ phân loại (`src/domains/tag/`)

Thư mục `src/domains/tag/` định nghĩa mô hình dữ liệu, các quy tắc nghiệp vụ, lỗi miền và giao diện lưu trữ phục vụ việc quản lý danh mục thẻ phân loại và gắn kết thẻ vào bài viết trong hệ thống Etsubi.

## Cấu trúc các thành phần

```text
src/domains/tag/
├── error.rs       # Định nghĩa các biến thể lỗi thẻ phân loại và ánh xạ sang mã trạng thái HTTP
├── mod.rs         # Khai báo và xuất các module con của phân hệ thẻ phân loại
├── repository.rs  # Khai báo trait trừu tượng hóa thao tác truy vấn bảng tags và bảng liên kết posts_tags
└── service.rs     # Cài đặt logic nghiệp vụ truy xuất danh mục thẻ, gắn thẻ và gỡ thẻ khỏi bài viết

```

## Tính năng và quy tắc nghiệp vụ chính

* **Truy xuất danh mục thẻ và bài viết theo thẻ**:
* Lấy toàn bộ danh sách thẻ cố định đã được khởi tạo trong hệ thống (`list_tags`) hoặc xem thông tin chi tiết một thẻ theo định danh (`get_tag`).


* Truy xuất danh sách các bài viết được gắn một thẻ cụ thể (`list_tag_posts`) và danh sách các thẻ đang gắn trên một bài viết (`list_post_tags`).




* **Gắn và gỡ thẻ trên bài viết (`attach_tag`, `detach_tag`)**:
* Xác minh cả bài viết và thẻ mục tiêu đều tồn tại ở trạng thái khả dụng trước khi thiết lập liên kết.
* Kiểm tra quyền sở hữu bài viết hoặc vai trò quản trị (`moderator`, `admin`), từ chối thao tác nếu người dùng không có quyền chỉnh sửa thẻ của bài viết.


* Đảm bảo tính duy nhất của liên kết giữa bài viết và thẻ, báo lỗi xung đột nếu thẻ đã được gắn sẵn (`AlreadyAttached`) hoặc chưa từng gắn khi thực hiện gỡ thẻ (`NotAttached`).





## Tính chất kỹ thuật

* **Phối hợp liên miền qua giao diện trừu tượng**: `TagService` kết hợp đồng thời `TagRepository` và `PostRepository` để kiểm tra sự tồn tại, trạng thái xóa mềm và quyền sở hữu bài viết trước khi thay đổi dữ liệu trong bảng liên kết.


* **Mô hình hóa quan hệ nhiều-nhiều qua bảng trung gian**: Liên kết giữa bài viết và thẻ được lưu trữ trong bảng `posts_tags` với khóa chính kết hợp `(post_id, tag_id)` tham chiếu tới `posts` và `tags`, đảm bảo không phát sinh bản ghi trùng lặp.


* **Chuẩn hóa phản hồi lỗi HTTP**: `TagError` sử dụng `thiserror` và triển khai `ResponseError` của `actix-web` để tự động chuyển đổi các lỗi nghiệp vụ sang mã trạng thái HTTP tương ứng (`403 Forbidden` khi không có quyền thao tác trên bài viết; `404 Not Found` khi không tìm thấy thẻ hoặc bài viết không khả dụng; `409 Conflict` khi thẻ đã được gắn hoặc chưa được gắn vào bài viết).
