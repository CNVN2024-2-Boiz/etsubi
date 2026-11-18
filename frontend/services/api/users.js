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
  // Backend dịch bài theo language, nên đổi ngôn ngữ mẹ đẻ thì gửi kèm language cùng giá trị.
  const body = Object.hasOwn(patch, 'native') ? { ...patch, language: patch.native } : patch;
  return request('/my', { method: 'PATCH', body });
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

/**
 * Kiểm tra mật khẩu qua đăng nhập công khai trước thao tác nhạy cảm.
 * Client chung coi 401 ở mọi request có Bearer là hết phiên, nên bước này giúp
 * biểu mẫu hiện lỗi mật khẩu tại chỗ mà không sửa client hoặc làm mất JWT hiện tại.
 * Token kiểm tra không được lưu; API đăng nhập không huỷ token đang dùng.
 */
async function verifyMyPassword(password) {
  const user = await getMe();
  await request('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email: user.email, password },
  });
}

/**
 * Đổi mật khẩu bằng hợp đồng PATCH /my/password, phản hồi thành công là 204.
 * Endpoint tăng token_version, vì vậy trang gọi phải đăng nhập lại ngay sau đó.
 * @param {object} values Mật khẩu hiện tại và mật khẩu mới, không lưu vào storage.
 * @returns {Promise<null>} Không có nội dung khi đổi thành công.
 */
export async function changeMyPassword({ currentPassword, newPassword }) {
  await verifyMyPassword(currentPassword);
  return request('/my/password', {
    method: 'PATCH',
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

/**
 * Xoá tài khoản đang đăng nhập, gửi mật khẩu trong JSON của DELETE /my.
 * request() hiện có đã gửi body với mọi phương thức, bao gồm DELETE.
 * @param {string} password Mật khẩu hiện tại chỉ dùng cho lần xác nhận này.
 * @returns {Promise<null>} Phản hồi rỗng khi tài khoản đã được xoá.
 */
export async function deleteMyAccount(password) {
  await verifyMyPassword(password);
  return request('/my', { method: 'DELETE', body: { password } });
}

// CẦN BACKEND: GET /my bổ sung updated_at (ISO 8601) để trang chỉnh sửa hiện thời gian lưu thật trên mọi thiết bị.
/** Đọc thời gian do API cung cấp; thiếu trường trả null để giao diện dùng lần lưu thật trong trình duyệt. */
export function getProfileUpdatedAt(user) {
  return user.updated_at ?? null;
}
