/** Kiểm tra biểu mẫu đăng nhập và đăng ký, trả gợi ý tiếng Việt cho từng trường. */
import { validateUsername, validateDisplayName } from '/utils/username.js';
import { t } from '/utils/i18n.js';

/**
 * Kiểm tra một trường của trang login hoặc register trước khi gọi API.
 * @param {string} name Tên trường trong biểu mẫu.
 * @param {object} options Giá trị, mật khẩu gốc, dấu chọn và chế độ đăng ký.
 * @returns {string} Chuỗi rỗng nếu hợp lệ, ngược lại là lời hướng dẫn sửa lỗi.
 */
export function authFieldMessage(name, { value = '', password = '', checked = false, register = false } = {}) {
  // Không cắt khoảng trắng mật khẩu vì đây là một phần thông tin đăng nhập.
  const text = ['password', 'confirm'].includes(name) ? value : value.trim();
  // Tên hiển thị và handle có quy tắc riêng, dùng chung cả ba trang nhập hồ sơ.
  if (name === 'displayname') {
    return validateDisplayName(value);
  }
  if (name === 'username') {
    return validateUsername(value);
  }
  if (name === 'terms') {
    return checked ? '' : t('Bạn cần đồng ý với điều khoản sử dụng.');
  }
  if (!text) {
    const instructions = {
      email: t('Vui lòng nhập email.'),
      password: t('Vui lòng nhập mật khẩu.'),
      confirm: t('Vui lòng xác nhận mật khẩu.'),
    };
    return instructions[name];
  }
  if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(text)) {
    return t('Vui lòng nhập địa chỉ email hợp lệ.');
  }
  // Chỉ áp dụng độ dài mật khẩu khi tạo mới, tránh chặn tài khoản đã có.
  if (name === 'password' && register && Array.from(text).length < 8) {
    return t('Mật khẩu cần ít nhất 8 ký tự.');
  }
  if (name === 'confirm' && text !== password) {
    return t('Mật khẩu xác nhận không khớp.');
  }
  return '';
}
