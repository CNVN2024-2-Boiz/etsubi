# Miền nghiệp vụ xác thực (`src/domains/auth/`)

Thư mục `src/domains/auth/` định nghĩa các quy tắc nghiệp vụ, lỗi miền và giao diện lưu trữ phục vụ việc đăng ký tài khoản, đăng nhập và quản lý phiên làm việc của người dùng trong hệ thống Etsubi.

## Cấu trúc các thành phần

```text
src/domains/auth/
├── error.rs       # Định nghĩa các biến thể lỗi xác thực và ánh xạ sang mã trạng thái HTTP
├── mod.rs         # Khai báo và xuất các module con của phân hệ xác thực
├── repository.rs  # Khai báo trait trừu tượng hóa thao tác truy vấn và cập nhật dữ liệu xác thực
└── service.rs     # Cài đặt logic nghiệp vụ đăng ký, đăng nhập và đăng xuất toàn cục

```

## Tính năng và quy tắc nghiệp vụ chính

* **Đăng ký tài khoản**:
* Kiểm tra tính hợp lệ của dữ liệu đầu vào gồm độ dài và định dạng tên đăng nhập (từ 3 đến 30 ký tự, chỉ chứa chữ thường `a-z`, chữ số `0-9` và dấu gạch dưới), độ dài mật khẩu tối thiểu 8 ký tự, độ dài tên hiển thị tối đa 50 ký tự và mã ngôn ngữ hợp lệ (`vi`, `en`, `ja`).


* Đảm bảo tính duy nhất của địa chỉ email và tên đăng nhập trước khi khởi tạo người dùng mới.


* Băm mật khẩu người dùng trước khi lưu trữ xuống tầng dữ liệu.




* **Đăng nhập và phát hành phiên**:
* Đối chiếu thông tin đăng nhập và kiểm tra trạng thái tài khoản, từ chối cấp phiên truy cập nếu tài khoản đang bị khóa (`banned`).


* Khởi tạo chuỗi mã thông báo JWT gắn kèm định danh người dùng, thời hạn hiệu lực (`jwt_expiry_hours`) và giá trị `token_version` hiện tại.




* **Đăng xuất và thu hồi phiên**:
* Thực hiện vô hiệu hóa toàn bộ các mã JWT đã cấp trước đó thông qua cơ chế tăng giá trị `token_version` của tài khoản trong cơ sở dữ liệu.





## Tính chất kỹ thuật

* **Tách biệt lưu trữ qua `AuthRepository**`: Giao diện `repository.rs` trừu tượng hóa các thao tác đọc và ghi dữ liệu xác thực, cho phép `AuthService` thực thi logic kiểm tra độc lập với chi tiết câu lệnh SQL của PostgreSQL.


* **Chuẩn hóa phản hồi lỗi bằng `thiserror` và `ResponseError**`: Các trường hợp lỗi nghiệp vụ trong `AuthError` tự động ánh xạ sang mã trạng thái HTTP tương ứng (`400 Bad Request` cho dữ liệu không hợp lệ, `401 Unauthorized` cho sai thông tin hoặc token hết hạn, `403 Forbidden` cho tài khoản bị khóa, `409 Conflict` cho trùng email hoặc tên đăng nhập).


* **Kiểm soát vòng đời token không trạng thái**: Kết hợp chữ ký đối xứng của JWT với bộ đếm `token_version` lưu trong bảng `users`, cho phép thu hồi phiên truy cập tức thì mà không cần lưu danh sách token thu hồi trong bộ nhớ.

