## Mối quan hệ giữa Service và các Repository.

![](../assets/backend-calling-deps.drawio.png)

## Các Service được gọi ra bên ngoài

![](../assets/external-calls-deps.drawio.png)

## Quy tắc khi gọi các service

Không xây thêm tầng application do quy mô chưa đủ lớn, mọi logic sau khi gọi service sẽ được xử lý tại handler.
