# Lớp khởi tạo và lắp ráp ứng dụng (`src/bootstrap/`)

Thư mục `src/bootstrap/` chịu trách nhiệm chuẩn bị môi trường vận hành, khởi tạo các tài nguyên dùng chung và lắp ráp toàn bộ các thành phần của hệ thống thành một máy chủ HTTP hoàn chỉnh trước khi tiếp nhận lưu lượng truy cập.

## Tính năng và nhiệm vụ chính

* **Quản lý cấu hình tập trung**: Đọc, phân tích cú pháp và kiểm tra tính hợp lệ của toàn bộ biến môi trường (thông số máy chủ, chuỗi kết nối PostgreSQL, khóa bí mật và thời hạn JWT, danh sách nguồn gốc CORS, cấu hình dịch vụ dịch thuật) thành các cấu trúc dữ liệu có kiểu rõ ràng.
* **Khởi tạo tài nguyên dùng chung (`AppState`)**: Thiết lập nhóm kết nối cơ sở dữ liệu PostgreSQL, khởi tạo các thành phần dịch vụ (xác thực, dịch thuật, lưu trữ) và đóng gói vào đối tượng trạng thái dùng chung để chia sẻ an toàn giữa các luồng xử lý của `actix-web`.
* **Thiết lập chuỗi middleware**: Gắn kết các lớp xử lý trung gian theo thứ tự thực thi trên mọi yêu cầu HTTP, bao gồm giới hạn tần suất truy cập theo địa chỉ IP, kiểm soát chia sẻ tài nguyên chéo nguồn (CORS), chuẩn hóa đường dẫn và ghi nhật ký truy vết yêu cầu.
* **Đăng ký định tuyến và tài liệu API**: Gắn các nhóm endpoint nghiệp vụ dưới tiền tố `/api/v1`, tích hợp điểm kiểm tra trạng thái hoạt động (`/api/v1/health`) và công khai giao diện tài liệu OpenAPI tại `/swagger-ui/`.

## Tính chất kỹ thuật

* **Tách biệt cấu hình khỏi logic thực thi**: Toàn bộ tham số vận hành được nạp một lần duy nhất lúc khởi động; tiến trình sẽ dừng ngay lập tức và báo lỗi rõ ràng nếu thiếu các biến môi trường bắt buộc như `DATABASE_URL` hoặc `JWT_KEY`.
* **Chia sẻ trạng thái an toàn đa luồng**: `AppState` sử dụng các kiểu dữ liệu hỗ trợ đồng bộ hóa (`Arc`, nhóm kết nối `r2d2::Pool`), cho phép các worker thread của `actix-web` truy cập tài nguyên đồng thời mà không phát sinh tranh chấp dữ liệu.
* **Tiêm phụ thuộc tập trung**: Các giao diện lưu trữ (`repository`) và dịch vụ hạ tầng được khởi tạo tại đây rồi truyền xuống lớp trình bày (`presentation`), giúp tách rời việc khởi tạo đối tượng khỏi mã xử lý từng endpoint.
* **Cấu trúc hóa nhật ký vận hành**: Tích hợp `tracing-actix-web` để gắn mã định danh riêng cho từng yêu cầu HTTP, phục vụ việc theo dõi luồng thực thi từ lúc tiếp nhận yêu cầu đến khi trả về phản hồi.
