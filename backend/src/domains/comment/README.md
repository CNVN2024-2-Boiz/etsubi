# Miền nghiệp vụ bình luận (`src/domains/comment/`)

Thư mục `src/domains/comment/` định nghĩa các thực thể, quy tắc kiểm tra nghiệp vụ, lỗi miền và giao diện lưu trữ phục vụ tính năng thảo luận, phản hồi đa cấp và kiểm duyệt bình luận trong hệ thống Etsubi.

## Cấu trúc các thành phần

```text
src/domains/comment/
├── error.rs       # Định nghĩa các biến thể lỗi bình luận và ánh xạ sang mã trạng thái HTTP
├── mod.rs         # Khai báo và xuất các module con của phân hệ bình luận
├── repository.rs  # Khai báo trait trừu tượng hóa thao tác truy vấn và cập nhật bảng comments
└── service.rs     # Cài đặt logic nghiệp vụ tạo, chỉnh sửa, xóa mềm, khôi phục và kiểm duyệt bình luận[cite: 2]

```

## Tính năng và quy tắc nghiệp vụ chính

* **Tạo bình luận và phản hồi phân cấp**:
* Cho phép người dùng tạo bình luận trực tiếp trên bài viết hoặc phản hồi bình luận khác thông qua trường liên kết `parent_id`.
* Kiểm tra tính hợp lệ của nội dung bình luận (không được để trống, không vượt quá giới hạn độ dài cho phép), xác minh bài viết và bình luận cha đều tồn tại ở trạng thái khả dụng.
* Từ chối tạo bình luận mới nếu bài viết đã bị tác giả hoặc quản trị viên khóa bình luận (`comments_locked`).
* Hỗ trợ lưu kèm ngôn ngữ nội dung (`language`) và tọa độ địa lý (`latitude`, `longitude`).


* **Chỉnh sửa và xóa mềm nội dung**:
* Chỉ cho phép chính tác giả bình luận thực hiện cập nhật nội dung hoặc xóa bình luận của mình.
* Áp dụng cơ chế xóa mềm thông qua cột `deleted_at` để ẩn bình luận khỏi luồng hiển thị thông thường mà vẫn bảo toàn dữ liệu trong cơ sở dữ liệu.


* **Kiểm duyệt và khôi phục nội dung**:
* Cung cấp các thao tác quản trị dành riêng cho vai trò `moderator` và `admin`, bao gồm xem danh sách bình luận ở mọi trạng thái, thay đổi trạng thái hiển thị (`status`) và khôi phục bình luận đã bị xóa mềm.





## Tính chất kỹ thuật

* **Phối hợp đa kho lưu trữ qua giao diện trừu tượng**: `CommentService` kết hợp đồng thời `CommentRepository`, `PostRepository` và `UserRepository` để kiểm tra chéo quyền hạn người dùng, trạng thái khóa của bài viết và tính hợp lệ của bình luận cha trước khi ghi dữ liệu.


* **Mô hình hóa cây thảo luận tự tham chiếu**: Cấu trúc bình luận sử dụng khóa ngoại tùy chọn `parent_id` trỏ về chính bảng `comments`, cho phép biểu diễn cấu trúc phản hồi lồng nhau trên cùng một thực thể dữ liệu.


* **Chuẩn hóa phản hồi lỗi bằng `thiserror` và `ResponseError**`: Các biến thể của `CommentError` tự động ánh xạ sang mã trạng thái HTTP tương ứng (`400 Bad Request` khi nội dung rỗng, quá dài hoặc trạng thái không hợp lệ; `403 Forbidden` khi bài viết bị khóa bình luận, không đủ quyền hạn hoặc thiếu vai trò quản trị; `404 Not Found` khi không tìm thấy người dùng, bài viết, bình luận hoặc bình luận cha).
