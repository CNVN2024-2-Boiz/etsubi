/** Khởi tạo trang đăng nhập, lưu phiên theo lựa chọn ghi nhớ rồi quay về trang hợp lệ. */
import { initAuthPage } from '/utils/auth-page.js';
import { login, safeRedirect } from '/utils/auth.js';
import { resendVerification } from '/services/api/auth.js';
import { routes } from '/utils/routes.js';
import { qs, el } from '/utils/dom.js';
import { t } from '/utils/i18n.js';

/**
 * Tài khoản chưa xác nhận email: hiện nút gửi lại mail ngay trong vùng thông báo của form.
 * @param {HTMLElement} info Vùng thông báo dạng info của biểu mẫu.
 * @param {string} email Email người dùng vừa nhập.
 */
function offerResend(info, email) {
  const button = el('button', { type: 'button', className: 'auth-card__inline-action' }, t('Gửi lại email xác nhận'));
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await resendVerification(email);
      info.replaceChildren(t('Đã gửi lại mail xác nhận. Hãy kiểm tra hộp thư, kể cả thư mục Spam.'));
    } catch {
      button.disabled = false;
    }
  });
  info.replaceChildren(t('Mở mail xác nhận Etsubi đã gửi khi bạn đăng ký, hoặc'), ' ', button);
  info.hidden = false;
}

// Nội dung lời chào riêng của trang; cảnh và tương tác biểu mẫu được dùng chung.
initAuthPage({
  mode: 'login',
  title: t('XIN CHÀO'),
  copyLines: [t('Cầu nối văn hoá Việt – Nhật'), t('cho sinh viên đại học.')],
  /** Gửi email và mật khẩu; chỉ chuyển hướng tới đường dẫn nội bộ đã kiểm tra. */
  async onSubmit(values, { redirect, info }) {
    try {
      await login(values.email, values.password, { remember: values.remember === 'on' });
    } catch (error) {
      if (error?.data?.code === 'email_not_verified') {
        offerResend(info, values.email);
      }
      throw error;
    }
    location.assign(safeRedirect(redirect, routes.home));
  },
});

// CẦN BACKEND: endpoint OAuth Google (ví dụ GET /auth/google chuyển hướng, callback trả token như POST /auth/login)
// Ghi vào vùng trạng thái riêng dưới nút để không xoá thông báo khác; không gửi form hoặc gọi API.
// Dùng ?. vì HTML cũ còn trong bộ nhớ đệm có thể chưa có nút hoặc vùng ghi chú này.
qs('[data-google-auth]')?.addEventListener('click', () => {
  const note = qs('[data-google-note]');
  if (!note) {
    return;
  }
  note.textContent = t('Đăng nhập bằng Google sắp có.');
  note.hidden = false;
});
