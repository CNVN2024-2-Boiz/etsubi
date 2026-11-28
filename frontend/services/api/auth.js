/** Các lời gọi xác thực cho trang đăng nhập, đăng ký và thao tác đăng xuất. */
import { request } from '/services/api/client.js';

/**
 * Tạo tài khoản ở trạng thái chờ xác nhận; máy chủ gửi mail kèm link kích hoạt.
 * @param {object} details Tên, email, mật khẩu, ngôn ngữ và hai ô đồng ý.
 * @returns {Promise<object>} Mã người dùng và status "pending".
 */
export function register({ displayname, username, email, password, native = 'vi', language = native, acceptTerms = false, acceptPrivacy = false }) {
  // Máy chủ trim displayname, rỗng thì lấy username, quá 50 ký tự trả 400.
  // language quyết định ngôn ngữ của mail xác nhận; hai ô đồng ý được lưu làm bằng chứng.
  return request('/auth/register', {
    method: 'POST',
    body: {
      displayname, username, email, password, native, language,
      accept_terms: acceptTerms,
      accept_privacy: acceptPrivacy,
    },
    auth: false,
  });
}

/**
 * Đổi link trong mail xác nhận lấy phiên đăng nhập; tài khoản chuyển sang hoạt động.
 * @param {string} token Token lấy từ tham số ?token= của link.
 * @returns {Promise<object>} Mã người dùng và JWT như khi đăng nhập.
 */
export function verifyEmail(token) {
  return request('/auth/verify-email', { method: 'POST', body: { token }, auth: false });
}

/**
 * Gửi lại mail xác nhận; máy chủ luôn trả 202 để không lộ email nào đã đăng ký.
 * @param {string} email Email đã dùng khi đăng ký.
 * @returns {Promise<null>} Phản hồi rỗng.
 */
export function resendVerification(email) {
  return request('/auth/resend-verification', { method: 'POST', body: { email }, auth: false });
}

/**
 * Yêu cầu link đặt lại mật khẩu; luôn 202 dù email có tồn tại hay không.
 * @param {string} email Email tài khoản.
 * @returns {Promise<null>} Phản hồi rỗng.
 */
export function forgotPassword(email) {
  return request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
}

/**
 * Đặt mật khẩu mới bằng token trong mail; mọi phiên cũ bị đăng xuất.
 * @param {string} token Token lấy từ link trong mail.
 * @param {string} password Mật khẩu mới.
 * @returns {Promise<null>} Phản hồi rỗng.
 */
export function resetPassword(token, password) {
  return request('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false });
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
