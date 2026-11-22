/** Chuyển liên kết HTML đã lưu tới trang mới và giữ lại tham số và hash. */
import { cleanUrlPath } from '/utils/routes.js';

// Tránh tải lặp nếu máy chủ phục vụ HTML dự phòng ở một URL khác ngoài bảng ánh xạ.
const target = cleanUrlPath(location);
if (target !== location.pathname + location.search + location.hash) location.replace(target);
