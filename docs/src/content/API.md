Sau khi truy cập url với port thì mở swagger ui ở `swagger-ui/#/` để xem các API route khả dụng. 

Lưu ý là một số route thì không cần đi qua middleware nhưng một số route thì có yêu cầu.

Trong trường hợp muốn test nhanh mà không cần setup front end thì có sẵn thư mục `scripts/` chứa các file curl để kiểm tra tính hợp lệ của request.

Bao gồm các file như:

```text
├── identity.sh
├── login.sh
├── modify.sh
└── register.sh
```

- identity.sh là để xác nhận thông tin user trong jwt hiện tại.
- login.sh là để đăng nhập và trả về jwt.
- modify.sh là để sửa thông tin cá nhân của user (chỉ có user được sửa, admin với moderator thì không).
- register.sh là để đăng ký tài khoản, sẽ trả về user id với trạng thái user bên trong là pending (cho đến khi verify email thành công).
