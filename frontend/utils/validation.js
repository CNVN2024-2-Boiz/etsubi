/** Kiểm tra biểu mẫu đăng nhập và đăng ký, trả gợi ý tiếng Việt cho từng trường. */

/**
 * Kiểm tra một trường của trang login hoặc register trước khi gọi API.
 * @param {string} name Tên trường trong biểu mẫu.
 * @param {object} options Giá trị, mật khẩu gốc, dấu chọn và chế độ đăng ký.
 * @returns {string} Chuỗi rỗng nếu hợp lệ, ngược lại là lời hướng dẫn sửa lỗi.
 */
export function authFieldMessage(name, { value = '', password = '', checked = false, register = false } = {}) {
  // Không cắt khoảng trắng mật khẩu vì đây là một phần thông tin đăng nhập.
  const text = ['password', 'confirm'].includes(name) ? value : value.trim();
  if (name === 'terms') {
    return checked ? '' : 'Bạn cần đồng ý với điều khoản sử dụng.';
  }
  if (!text) {
    const instructions = {
      username: 'nhập họ và tên.',
      email: 'nhập email.',
      password: 'nhập mật khẩu.',
      confirm: 'xác nhận mật khẩu.',
    };
    return 'Vui lòng ' + instructions[name];
  }
  // Rust kiểm tra tên theo số byte UTF-8: một chữ Nhật có thể đã đủ ba byte.
  if (name === 'username' && new TextEncoder().encode(text).length < 3) {
    return 'Tên cần ít nhất 3 ký tự.';
  }
  if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(text)) {
    return 'Vui lòng nhập địa chỉ email hợp lệ.';
  }
  // Chỉ áp dụng độ dài mật khẩu khi tạo mới, tránh chặn tài khoản đã có.
  if (name === 'password' && register && Array.from(text).length < 8) {
    return 'Mật khẩu cần ít nhất 8 ký tự.';
  }
  if (name === 'confirm' && text !== password) {
    return 'Mật khẩu xác nhận không khớp.';
  }
  return '';
}
