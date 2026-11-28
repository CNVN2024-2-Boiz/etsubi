/** Báo cáo vi phạm: gửi tới máy chủ, máy chủ gửi email về hộp thư kiểm duyệt của Etsubi. */
import { request } from '/services/api/client.js';

/**
 * Gửi một báo cáo vi phạm. Người báo cáo lấy từ token đăng nhập, không gửi kèm trong body.
 * Máy chủ trả 204 khi đã gửi email; 409 khi vừa báo cáo cùng nội dung hoặc gửi quá nhiều báo cáo.
 * @param {object} report Báo cáo cần gửi.
 * @param {'post'|'comment'|'user'} report.targetType Loại nội dung bị báo cáo.
 * @param {string} report.targetId Mã bài viết, bình luận hoặc người dùng.
 * @param {string[]} report.reasons Mã lý do (ví dụ spam, hate, other).
 * @param {string} [report.details] Mô tả thêm, bắt buộc khi chọn "Lý do khác", tối đa 1000 ký tự.
 * @returns {Promise<null>} null khi thành công.
 */
export function sendReport({ targetType, targetId, reasons, details }) {
  const body = { target_type: targetType, target_id: targetId, reasons };
  // Chỉ gửi mô tả khi người dùng có viết, để máy chủ không nhận chuỗi rỗng.
  if (details && details.trim()) {
    body.details = details.trim();
  }
  return request('/reports', { method: 'POST', body });
}
