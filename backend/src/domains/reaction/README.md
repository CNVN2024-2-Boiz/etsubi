# Miền nghiệp vụ biểu cảm bài viết (`src/domains/reaction/`)

Thư mục `src/domains/reaction/` định nghĩa mô hình dữ liệu, các quy tắc kiểm tra nghiệp vụ, lỗi miền và giao diện lưu trữ phục vụ tính năng thả, cập nhật, xóa và thống kê biểu cảm (`emoji`) trên bài viết trong hệ thống Etsubi.

## Cấu trúc các thành phần

```text
src/domains/reaction/
├── error.rs       # Định nghĩa các biến thể lỗi biểu cảm và ánh xạ sang mã trạng thái HTTP
├── mod.rs         # Khai báo và xuất các module con của phân hệ biểu cảm
├── repository.rs  # Khai báo trait trừu tượng hóa thao tác truy vấn và cập nhật bảng reactions
└── service.rs     # Cài đặt logic nghiệp vụ thả, cập nhật, gỡ bỏ và thống kê biểu cảm theo bài viết

```

## Tính năng và quy tắc nghiệp vụ chính

* **Thả và cập nhật biểu cảm (`upsert_reaction`)**:
* Kiểm tra tính hợp lệ của chuỗi ký tự biểu cảm (không được để trống và không vượt quá giới hạn độ dài cho phép).
* Xác minh bài viết mục tiêu đang tồn tại ở trạng thái khả dụng thông qua kho lưu trữ bài viết trước khi ghi nhận biểu cảm.
* Áp dụng cơ chế ghi đè (`upsert`): nếu người dùng chưa thả biểu cảm trên bài viết thì tạo mới; nếu đã tồn tại thì cập nhật sang biểu cảm mới kèm thời điểm tương tác (`reacted_at`).


* **Gỡ bỏ biểu cảm (`remove_reaction`)**:
* Xóa bản ghi biểu cảm của người dùng hiện tại trên bài viết, trả về lỗi không tìm thấy nếu người dùng chưa từng tương tác với bài viết đó.


* **Truy vấn và thống kê biểu cảm**:
* Lấy biểu cảm hiện tại của người dùng trên một bài viết cụ thể.
* Liệt kê danh sách chi tiết các lượt thả biểu cảm của một bài viết.
* Tổng hợp số lượng lượt thả theo từng loại `emoji` trên bài viết để hiển thị tóm tắt.



## Tính chất kỹ thuật

* **Phối hợp liên miền qua giao diện trừu tượng**: `ReactionService` kết hợp đồng thời `ReactionRepository` và `PostRepository` để xác nhận bài viết tồn tại và chưa bị xóa mềm trước khi thực hiện thao tác tương tác.
* **Ràng buộc mỗi người dùng một biểu cảm trên mỗi bài viết**: Quan hệ tương tác được lưu trong bảng `reactions` với khóa chính kết hợp `(user_id, post_id)`, đảm bảo mỗi tài khoản chỉ giữ một trạng thái biểu cảm duy nhất cho từng bài viết ở mọi thời điểm.
* **Chuẩn hóa phản hồi lỗi HTTP**: `ReactionError` sử dụng `thiserror` và triển khai `ResponseError` của `actix-web` để ánh xạ trực tiếp các lỗi miền sang mã trạng thái HTTP tương ứng (`400 Bad Request` khi chuỗi biểu cảm rỗng hoặc quá dài; `404 Not Found` khi bài viết không khả dụng hoặc không tìm thấy lượt biểu cảm).
