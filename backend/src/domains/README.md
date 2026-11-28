# Lớp nghiệp vụ (`src/domains/`)

Thư mục `src/domains/` chứa toàn bộ mô hình dữ liệu, quy tắc nghiệp vụ và các giao diện lưu trữ trừu tượng của hệ thống Etsubi, được chia tách độc lập theo từng miền chức năng.

## Cấu trúc các phân hệ nghiệp vụ

```text
src/domains/
├── auth/          # Quy tắc đăng ký, đăng nhập, quản lý phiên và vô hiệu hóa token theo phiên bản
├── users/         # Mô hình hồ sơ người dùng, phân quyền (user, moderator, admin) và trạng thái hạn chế tài khoản
├── posts/         # Thực thể bài viết, quy tắc phân loại, gắn tọa độ, khóa bình luận, xóa mềm và khôi phục
├── comments/      # Thực thể bình luận phân cấp (parent_id), kiểm tra điều kiện phản hồi và vòng đời nội dung
├── interactions/  # Nghiệp vụ thả biểu cảm (reactions), lưu bài viết (bookmarks) và theo dõi người dùng (follows)
├── tags/          # Quản lý danh mục thẻ phân loại bài viết và quy tắc liên kết bài viết với thẻ
├── notifications/ # Mô hình thông báo sự kiện, quy tắc phát sinh thông báo và gửi thông báo hàng loạt
└── translation/   # Quy tắc nhận diện ngôn ngữ, yêu cầu dịch nội dung và quản lý vòng đời bản dịch lưu trữ

```

## Tính năng và quy tắc nghiệp vụ chính

* **Xác thực và bảo mật phiên (`auth/`)**: Định nghĩa dữ liệu đầu vào cho việc đăng ký, đăng nhập; kiểm soát tính hợp lệ của thông tin định danh và quản lý cơ chế tăng `token_version` khi người dùng đăng xuất khỏi toàn bộ thiết bị.
* **Quản lý người dùng (`users/`)**: Quy định cấu trúc thông tin cá nhân, vai trò hệ thống (`user`, `moderator`, `admin`), ngôn ngữ ưu tiên và các trạng thái kiểm soát truy cập gồm khóa tài khoản (`banned`) hoặc cấm tương tác có thời hạn (`muted_until`).
* **Nội dung bài viết và bình luận (`posts/`, `comments/`)**:
* Quản lý nội dung bài viết (tiêu đề, nội dung, loại bài viết, tọa độ địa lý) và cấu trúc bình luận lồng nhau thông qua liên kết `parent_id`.
* Áp dụng cơ chế xóa mềm (`deleted_at`) để bảo toàn dữ liệu phục vụ khôi phục bởi quản trị viên, đồng thời chặn tạo bình luận mới trên các bài viết đã bị khóa bình luận.


* **Tương tác xã hội và phân loại (`interactions/`, `tags/`)**:
* Đảm bảo tính duy nhất của mỗi lượt lưu bài viết, lượt theo dõi giữa hai người dùng và trạng thái biểu cảm trên từng bài viết hoặc bình luận.
* Quản lý danh sách thẻ gắn kèm bài viết và các tiêu chí lọc, tìm kiếm, gợi ý người dùng nổi bật.


* **Thông báo sự kiện (`notifications/`)**: Chuẩn hóa các loại thông báo (theo dõi mới, biểu cảm, bình luận, phản hồi, nhắc tên `@mention`, thông báo hệ thống) và trạng thái đã đọc hoặc chưa đọc của từng người nhận.
* **Dịch thuật đa ngôn ngữ (`translation/`)**: Định nghĩa cấu trúc yêu cầu dịch bài viết và bình luận sang ngôn ngữ đích của người dùng, kèm quy tắc vô hiệu hóa bản dịch đã lưu khi nội dung gốc thay đổi.

## Tính chất kỹ thuật

* **Độc lập với hạ tầng và giao thức**: Lớp `domains/` không phụ thuộc trực tiếp vào `actix-web` hay các chi tiết kết nối cơ sở dữ liệu của `diesel`, giúp logic nghiệp vụ thuần túy và dễ kiểm soát.
* **Đảo ngược phụ thuộc qua giao diện (`trait`)**: Mỗi phân hệ định nghĩa các `trait` cho tầng lưu trữ (`Repository`) và dịch vụ bên ngoài, cho phép lớp `infrastructure/` triển khai cụ thể mà không làm thay đổi mã nguồn nghiệp vụ.
* **Ràng buộc dữ liệu qua kiểu tĩnh**: Tận dụng hệ thống kiểu của Rust (`enum` cho vai trò, loại thông báo, loại tương tác; kiểu bọc định danh `Uuid`, thời gian `DateTime<Utc>`) để ngăn chặn các trạng thái dữ liệu không hợp lệ ngay từ lúc biên dịch.
* **Chuẩn hóa lỗi nghiệp vụ**: Định nghĩa tập trung các biến thể lỗi miền (không tìm thấy tài nguyên, xung đột dữ liệu, không đủ quyền hạn, dữ liệu đầu vào không hợp lệ) để lớp trình bày ánh xạ thống nhất sang mã phản hồi HTTP.
