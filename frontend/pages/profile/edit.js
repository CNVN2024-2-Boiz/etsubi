// Dùng route chung cho URL cũ, giữ neo để mở đúng mục trong trang Cài đặt mới.
import { routes } from '/utils/routes.js';

// Thay lịch sử hiện tại để nút quay lại không lặp trang chuyển hướng.
location.replace(routes.settings + location.hash);
