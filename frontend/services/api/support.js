/** Yêu cầu hỗ trợ và báo cáo vi phạm cho trang Hỗ trợ; backend chưa có nên các hàm không gửi yêu cầu khi cờ tắt. */
import { request } from '/services/api/client.js';
import { backendSupports } from '/services/api/capabilities.js';

// CẦN BACKEND: POST /support/tickets nhận { topic, email, message } (JWT tuỳ chọn, người chưa đăng nhập vẫn gửi được bằng email) và trả 201 { id, status: "open", created_at }; đội ngũ trả lời qua email trong 24 giờ.
/**
 * Gửi yêu cầu hỗ trợ từ hộp thoại "Gửi yêu cầu"; null nghĩa là backend chưa hỗ trợ và chưa gửi gì.
 * @param {object} ticket { topic, email, message } người dùng nhập.
 * @returns {Promise<object|null>} Phiếu hỗ trợ vừa tạo, hoặc null khi chưa hỗ trợ.
 */
export async function createSupportTicket({ topic, email, message }) {
  if (!backendSupports.supportTickets) {
    return null;
  }
  return request('/support/tickets', { method: 'POST', body: { topic, email, message } });
}

// CẦN BACKEND: POST /reports nhận { target_url, reason, message } (cần JWT; sau này có thể đổi target_url thành target_type + target_id) và trả 201 { id, status: "pending" }; đội kiểm duyệt xem trong trang Mod/Admin.
/**
 * Gửi báo cáo vi phạm về một bài viết hoặc bình luận; null nghĩa là backend chưa hỗ trợ.
 * @param {object} report { target_url, reason, message }.
 * @returns {Promise<object|null>} Báo cáo vừa tạo, hoặc null khi chưa hỗ trợ.
 */
export async function createReport({ target_url: targetUrl, reason, message }) {
  if (!backendSupports.contentReports) {
    return null;
  }
  return request('/reports', { method: 'POST', body: { target_url: targetUrl, reason, message } });
}
