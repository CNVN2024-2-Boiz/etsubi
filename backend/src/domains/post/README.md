# Miền nghiệp vụ bài viết (`src/domains/post/`)

Thư mục `src/domains/post/` định nghĩa các thực thể, quy tắc kiểm tra nghiệp vụ, lỗi miền và giao diện lưu trữ phục vụ việc đăng tải, tìm kiếm, phân loại, xóa mềm và kiểm duyệt bài viết trong hệ thống Etsubi.

## Cấu trúc các thành phần

```text
src/domains/post/
├── error.rs       # Định nghĩa các biến thể lỗi bài viết và ánh xạ sang mã trạng thái HTTP
├── mod.rs         # Khai báo và xuất các module con của phân hệ bài viết
├── repository.rs  # Khai báo trait trừu tượng hóa thao tác truy vấn và cập nhật bảng posts
└── service.rs     # Cài đặt logic nghiệp vụ tạo, cập nhật, tìm kiếm, liệt kê và kiểm duyệt bài viết[cite: 2]

```

## Tính năng và quy tắc nghiệp vụ chính

* **Tạo và cập nhật bài viết**:
* Kiểm tra tính hợp lệ của tiêu đề (không được để trống, không vượt quá giới hạn độ dài), nội dung bài viết và trạng thái hiển thị (`status`).
* Xác thực tính hợp lệ của tọa độ địa lý đi kèm: vĩ độ (`latitude`) và kinh độ (`longitude`) phải cùng có hoặc cùng bỏ trống, với giá trị nằm trong khoảng $[-90, 90]$ cho vĩ độ và $[-180, 180]$ cho kinh độ.
* Từ chối chỉnh sửa nội dung khi bài viết đang ở trạng thái bị ẩn (`HiddenCannotEdit`) hoặc người thực hiện không phải tác giả bài viết.


* **Xóa mềm và khôi phục nội dung**:
* Hỗ trợ xóa mềm bài viết thông qua cột `deleted_at` để ẩn khỏi các danh sách công khai mà vẫn lưu giữ dữ liệu gốc.
* Cung cấp các thao tác quản trị cho đội ngũ `moderator` và `admin` nhằm thay đổi trạng thái kiểm duyệt bài viết và khôi phục bài viết đã bị xóa mềm.


* **Tìm kiếm và khám phá bài viết**:
* Tìm kiếm bài viết theo từ khóa truy vấn (giới hạn tối đa 200 ký tự) kết hợp lọc theo thẻ.
* Cung cấp các luồng danh sách bài viết theo nhiều tiêu chí: bài viết mới nhất (`newest`), bài viết nổi bật (`highlight`), bài viết phổ biến (`popular`), chuyên mục hỏi đáp (`question_and_answer`), bài viết theo tác giả và bài viết từ những người dùng đang theo dõi.





## Tính chất kỹ thuật

* **Phối hợp liên miền qua giao diện trừu tượng**: `PostService` kết hợp đồng thời `PostRepository` và `UserRepository` để xác minh sự tồn tại của tác giả, kiểm tra quyền sở hữu nội dung và đối chiếu vai trò quản trị trước khi thực hiện thay đổi dữ liệu.


* **Ràng buộc dữ liệu toàn vẹn ở tầng nghiệp vụ**: Các điều kiện về tọa độ địa lý, độ dài chuỗi đầu vào và trạng thái khóa bình luận (`comments_locked`) được kiểm tra tập trung trong `PostService` trước khi chuyển xuống tầng lưu trữ PostgreSQL.


* **Chuẩn hóa phản hồi lỗi bằng `thiserror` và `ResponseError**`: `PostError` tự động ánh xạ các lỗi nghiệp vụ sang mã trạng thái HTTP tương ứng (`400 Bad Request` khi tiêu đề rỗng, nội dung hoặc từ khóa quá dài, tọa độ hoặc trạng thái không hợp lệ; `403 Forbidden` khi không có quyền thao tác hoặc bài viết đang bị ẩn; `404 Not Found` khi không tìm thấy người dùng hoặc bài viết).
