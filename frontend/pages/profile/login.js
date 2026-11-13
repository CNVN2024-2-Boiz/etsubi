/** Khởi tạo trang đăng nhập, lưu phiên theo lựa chọn ghi nhớ rồi quay về trang hợp lệ. */
import { initAuthPage } from '/utils/auth-page.js';
import { login, safeRedirect } from '/utils/auth.js';
import { routes } from '/utils/routes.js';

// Nội dung lời chào riêng của trang; cảnh và tương tác biểu mẫu được dùng chung.
initAuthPage({
  mode: 'login',
  copyLines: ['Cầu nối văn hoá Việt – Nhật', 'cho sinh viên đại học.'],
  /** Gửi email và mật khẩu; chỉ chuyển hướng tới đường dẫn nội bộ đã kiểm tra. */
  async onSubmit(values, { redirect }) {
    await login(values.email, values.password, { remember: values.remember === 'on' });
    location.assign(safeRedirect(redirect, routes.home));
  },
});
