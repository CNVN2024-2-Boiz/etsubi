# Miền nghiệp vụ người dùng (`src/domains/user/`)

Thư mục `src/domains/user/` định nghĩa các thực thể, quy tắc kiểm tra dữ liệu hồ sơ, phân cấp quyền hạn và giao diện lưu trữ phục vụ việc quản lý tài khoản người dùng trong hệ thống Etsubi.

## Cấu trúc các thành phần

```text
src/domains/user/
├── error.rs       # Định nghĩa các biến thể lỗi người dùng và ánh xạ sang mã trạng thái HTTP
├── mod.rs         # Khai báo và xuất các module con của phân hệ người dùng
├── repository.rs  # Khai báo trait trừu tượng hóa thao tác truy vấn và cập nhật bảng users
└── service.rs     # Cài đặt logic nghiệp vụ quản lý hồ sơ cá nhân, đổi mật khẩu, xóa tài khoản và kiểm duyệt người dùng

```

## Tính năng và quy tắc nghiệp vụ chính

* **Quản lý thông tin hồ sơ cá nhân**:
* Truy xuất thông tin công khai của người dùng hoặc hồ sơ chi tiết của tài khoản đang đăng nhập.
* Cập nhật các trường thông tin cá nhân (tên hiển thị, tên đăng nhập, địa chỉ email, tổ chức, địa chỉ, ngôn ngữ mẹ đẻ, ngôn ngữ giao diện, ảnh đại diện, tiểu sử) kèm kiểm tra định dạng tên đăng nhập (từ 3 đến 30 ký tự, chỉ gồm chữ thường `a-z`, chữ số `0-9` và dấu gạch dưới), độ dài tên hiển thị tối đa 50 ký tự và mã ngôn ngữ hợp lệ (`vi`, `en`, `ja`).
* Đảm bảo tính duy nhất của email và tên đăng nhập trên toàn hệ thống khi người dùng thay đổi thông tin.
* Hỗ trợ đổi mật khẩu và tự xóa tài khoản cá nhân (ngăn chặn tài khoản quản trị viên `admin` tự xóa chính mình).


* **Phân cấp quyền hạn và kiểm duyệt tài khoản**:
* Áp dụng mô hình phân quyền 3 cấp bậc: `user`, `moderator` và `admin`.
* Cho phép đội ngũ quản trị (`moderator`, `admin`) thay đổi trạng thái hoạt động của tài khoản (`active` hoặc `banned`) và thiết lập thời hạn cấm tương tác (`muted_until`).
* Cho phép `admin` điều chỉnh vai trò của người dùng giữa `user` và `moderator`, đồng thời ngăn chặn việc tự thay đổi vai trò của chính mình, tự khóa tài khoản của mình hoặc tác động lên tài khoản có cấp bậc ngang bằng hoặc cao hơn.



## Tính chất kỹ thuật

* **Tách biệt lưu trữ qua `UserRepository**`: Giao diện `repository.rs` trừu tượng hóa các thao tác đọc và ghi trên bảng `users`, cho phép `UserService` thực thi đầy đủ các quy tắc kiểm tra phân quyền mà không phụ thuộc trực tiếp vào thư viện cơ sở dữ liệu.
* **Kiểm soát phân cấp quyền hạn chặt chẽ**: Toàn bộ quy tắc bảo vệ phân cấp vai trò (như `CannotModifyHigherRole`, `CannotAssignAdminRole`, `CannotChangeOwnRole`, `CannotBanSelf`, `CannotMuteSelf`) được thực thi tập trung trong `UserService` trước khi phát sinh lệnh cập nhật dữ liệu.
* **Chuẩn hóa phản hồi lỗi HTTP**: `UserError` sử dụng `thiserror` và triển khai `ResponseError` của `actix-web` để chuyển đổi trực tiếp các lỗi miền sang mã trạng thái HTTP tương ứng (`400 Bad Request` khi dữ liệu hồ sơ, vai trò hoặc trạng thái không hợp lệ; `403 Forbidden` khi chỉnh sửa hồ sơ người khác hoặc vi phạm quy tắc phân cấp quyền hạn; `404 Not Found` khi không tìm thấy người dùng; `409 Conflict` khi trùng email hoặc tên đăng nhập).
