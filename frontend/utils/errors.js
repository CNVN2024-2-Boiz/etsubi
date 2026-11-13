/** Ánh xạ lỗi API sang tiếng Việt cho gợi ý trường và thông báo trên mọi trang. */

/**
 * Chọn lời giải thích phù hợp cho lỗi ở trang đăng nhập, đăng ký và nội dung.
 * @param {object} error Lỗi có status và message từ API.
 * @returns {string} Thông báo tiếng Việt hoặc thông báo gốc khi chưa có ánh xạ.
 */
export function toVietnameseMessage(error) {
  const message = error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  if (error?.status === 0) {
    return 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.';
  }
  if (error?.status === 429) {
    return 'Bạn thao tác quá nhanh, thử lại sau giây lát.';
  }
  if (error?.status >= 500) {
    return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
  }
  if (/invalid credentials/i.test(message)) {
    return 'Email hoặc mật khẩu không chính xác.';
  }
  if (/account (?:is|has been) banned/i.test(message)) {
    return 'Tài khoản của bạn đã bị khoá.';
  }
  if (/email already (?:exists|taken)/i.test(message)) {
    return 'Email này đã được sử dụng.';
  }
  if (/username already taken/i.test(message)) {
    return 'Tên này đã có người dùng.';
  }
  if (/username too short/i.test(message)) {
    return 'Tên cần ít nhất 3 ký tự.';
  }
  if (/password too weak|weak password|password.*(?:8|short)/i.test(message)) {
    return 'Mật khẩu cần ít nhất 8 ký tự.';
  }
  if (/invalid language/i.test(message)) {
    return 'Ngôn ngữ không hợp lệ.';
  }
  // Lỗi cấm viết có thể kèm thời hạn; diễn đạt ngày theo tiếng Việt nếu đọc được.
  if (/muted/i.test(message)) {
    const until = message.match(/until\s+(.+)/i)?.[1];
    const date = until ? new Date(until) : null;
    // Chỉ thêm thời hạn khi máy chủ gửi ngày hợp lệ, tránh hiện chữ ngày lỗi.
    let deadline = '';
    if (date && !Number.isNaN(date.getTime())) {
      deadline = ' đến ' + date.toLocaleString('vi-VN');
    }
    return 'Tài khoản đang bị tạm khoá chức năng viết' + deadline + '.';
  }
  return message;
}

/**
 * Tìm trường cần sửa trên trang login hoặc register từ thông báo API.
 * @param {object} error Lỗi có message tiếng Anh.
 * @returns {string|null} Tên trường hoặc null để hiện lỗi chung của biểu mẫu.
 */
export function fieldForError(error) {
  const message = error?.message || '';
  // Sai thông tin đăng nhập không tiết lộ riêng email hay mật khẩu bị sai.
  if (/invalid credentials/i.test(message)) {
    return null;
  }
  if (/email/i.test(message)) {
    return 'email';
  }
  if (/username/i.test(message)) {
    return 'username';
  }
  if (/password/i.test(message)) {
    return 'password';
  }
  return null;
}
