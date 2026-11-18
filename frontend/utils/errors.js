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
  // Máy chủ nói cả email và username thì không suy đoán trường trùng.
  if (error?.status === 409 && /email/i.test(message) && /username/i.test(message)) {
    return 'Email hoặc @tên người dùng đã được dùng.';
  }
  if (/email already (?:exists|taken)/i.test(message)) {
    return 'Email này đã được sử dụng.';
  }
  if (/username already taken/i.test(message)) {
    return '@tên người dùng này đã có người dùng, hãy chọn tên khác.';
  }
  if (/username too short/i.test(message)) {
    return 'Tên người dùng cần ít nhất 3 ký tự.';
  }
  // Máy chủ từ chối @tên có chữ hoa, khoảng trắng, ký tự lạ hoặc dài quá 30 ký tự.
  if (/username must be/i.test(message)) {
    return '@tên người dùng gồm 3-30 ký tự: chữ thường a-z, số hoặc dấu gạch dưới.';
  }
  if (/password too weak|weak password|password.*(?:8|short)/i.test(message)) {
    return 'Mật khẩu cần ít nhất 8 ký tự.';
  }
  // Lỗi tên hiển thị khi đăng ký và khi PATCH hồ sơ (giới hạn 50 ký tự sau trim).
  if (/display ?name too long/i.test(message)) {
    return 'Tên hiển thị không được vượt quá 50 ký tự.';
  }
  if (/display ?name cannot be empty/i.test(message)) {
    return 'Vui lòng nhập tên hiển thị.';
  }
  // Lỗi khi đăng bài ở Diễn đàn (PostError của backend).
  if (/title cannot be empty/i.test(message)) {
    return 'Bài viết cần có tiêu đề.';
  }
  if (/title too long/i.test(message)) {
    return 'Tiêu đề quá dài (tối đa 255 ký tự).';
  }
  if (/content too long/i.test(message)) {
    return 'Nội dung quá dài.';
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
 * Diễn giải lỗi của nút "Dịch" ở trang đọc bài (POST /posts/{id}/translate và /comments/{id}/translate).
 * @param {object} error Lỗi có status từ API.
 * @returns {string} Thông báo tiếng Việt ngắn để hiện ngay cạnh nội dung.
 */
export function translationErrorMessage(error) {
  // 503: máy chủ chưa cấu hình dịch vụ dịch; 504: dịch vụ dịch trả lời quá lâu.
  if (error?.status === 503) {
    return 'Dịch vụ dịch chưa sẵn sàng. Vui lòng thử lại sau.';
  }
  if (error?.status === 504) {
    return 'Dịch quá lâu, vui lòng thử lại.';
  }
  if (error?.status === 400) {
    return 'Nội dung quá dài để dịch.';
  }
  return toVietnameseMessage(error);
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
  // Lỗi gộp không được gán riêng vào email hoặc handle.
  if (/email/i.test(message) && /username/i.test(message)) {
    return null;
  }
  if (/display ?name/i.test(message)) {
    return 'displayname';
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
