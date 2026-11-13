/** Dữ liệu hồ sơ dùng cho phiên đăng nhập, header và thông tin tác giả bài viết. */
import { request } from '/services/api/client.js';

/**
 * Đọc hồ sơ đang đăng nhập cho header và các trang yêu cầu phiên.
 * @returns {Promise<object>} Hồ sơ của chủ JWT hiện tại.
 */
export function getMe() {
  return request('/my');
}

/**
 * Cập nhật hồ sơ từ trang đăng ký nâng cao hoặc trang cá nhân.
 * @param {object} patch Các trường hồ sơ cần thay đổi.
 * @returns {Promise<object>} Hồ sơ sau cập nhật.
 */
export function updateMe(patch) {
  return request('/my', { method: 'PATCH', body: patch });
}

// Lưu cả Promise để nhiều thẻ cùng tác giả không gửi trùng yêu cầu đang chờ.
const users = new Map();

/**
 * Đọc hồ sơ công khai để bổ sung tên tác giả trên trang nội dung và tìm kiếm.
 * @param {string} id Mã người dùng.
 * @returns {Promise<object>} Hồ sơ công khai được dùng lại trong bộ nhớ.
 */
export function getUser(id) {
  if (!users.has(id)) {
    // Xoá kết quả lỗi khỏi bộ nhớ để lần gọi sau có thể thử lại.
    const pending = request('/users/' + encodeURIComponent(id)).catch(error => {
      users.delete(id);
      throw error;
    });
    users.set(id, pending);
  }
  return users.get(id);
}
