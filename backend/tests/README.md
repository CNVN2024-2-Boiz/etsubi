## Test được chia làm hai phần:

- CRUD: Nơi kiểm tra khả năng xử lý dữ liệu từ phía server.

- RBAC: Để đảm bảo khả năng quản lý thì ta sẽ chia chức năng dựa theo vai trò bao gồm: user ,moderator, admin.

## Cấu trúc thư mục hiện tịa:
```text
tests/
├── common/mod.rs              # Helper dùng chung để tạo và xóa dữ liệu
├── crud/                      # CRUD 
├── rbac/                      # Phân quyền
└── mod.rs                     
```
