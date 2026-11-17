/** Các lời gọi xác thực cho trang đăng nhập, đăng ký và thao tác đăng xuất. */
import { request } from '/services/api/client.js';

/**
 * Tạo tài khoản cho trang đăng ký, chưa tạo phiên đăng nhập.
 * @param {object} details Tên, email, mật khẩu, tiếng mẹ đẻ và ngôn ngữ giao diện.
 * @returns {Promise<object>} Mã người dùng vừa tạo.
 */
export function register({ displayname, username, email, password, native = 'vi', language = 'vi' }) {
  // Máy chủ trim displayname, rỗng thì lấy username, quá 50 ký tự trả 400.
  return request('/auth/register', {
    method: 'POST',
    body: { displayname, username, email, password, native, language },
    auth: false,
  });
}

/**
 * Đăng nhập bằng email cho cả trang đăng nhập và luồng sau đăng ký.
 * @param {object} credentials Email và mật khẩu người dùng nhập.
 * @returns {Promise<object>} Mã người dùng và JWT từ API.
 */
export function login({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

/**
 * Vô hiệu hoá phiên phía máy chủ từ menu header hoặc trang xác thực.
 * @returns {Promise<null>} Phản hồi rỗng nếu thành công.
 */
export function logout() {
  return request('/auth/logout', { method: 'POST' });
}
