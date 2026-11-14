/**
 * Thao tác quản trị (Điều hành viên / Quản trị viên) qua các endpoint /manage của backend.
 * Backend tự kiểm tra quyền: không ai tác động được người cùng cấp hoặc cao hơn, chỉ Admin đổi vai trò.
 */
import { request } from '/services/api/client.js';
import { backendSupports } from '/services/api/capabilities.js';
import { notifyAfter, notifyPostAfter } from '/services/api/notify-actions.js';

/**
 * Cấm hoặc gỡ cấm tài khoản.
 * @param {string} userId Mã người dùng bị tác động.
 * @param {'active'|'banned'} status Trạng thái mới.
 * @returns {Promise<object>} Hồ sơ sau khi cập nhật (GetUserResponse).
 */
export async function setUserStatus(userId, status) {
  const result = await request('/manage/users/' + encodeURIComponent(userId) + '/status', { method: 'PATCH', body: { status } });
  // Chỉ cấm tài khoản mới báo cho thành viên; gỡ cấm giữ nguyên luồng hiện tại.
  if (status === 'banned') {
    await notifyAfter('banned', { targetUserId: userId, link: '/users/' + encodeURIComponent(userId) });
  }
  return result;
}

/**
 * Đổi vai trò (chỉ Admin): giữa "user" và "moderator", không gán được "admin".
 * @param {string} userId Mã người dùng.
 * @param {'user'|'moderator'} role Vai trò mới.
 * @returns {Promise<object>} Hồ sơ sau khi cập nhật.
 */
export function setUserRole(userId, role) {
  return request('/manage/users/' + encodeURIComponent(userId) + '/role', { method: 'PATCH', body: { role } });
}

/**
 * Tắt tiếng đến một thời điểm, hoặc gỡ tắt tiếng khi truyền null.
 * @param {string} userId Mã người dùng.
 * @param {Date|null} until Thời điểm hết hạn; null để gỡ.
 * @returns {Promise<object>} Hồ sơ sau khi cập nhật (có muted_until).
 */
export async function setUserMute(userId, until) {
  const mutedUntil = until ? until.toISOString() : null;
  const result = await request('/manage/users/' + encodeURIComponent(userId) + '/mute', {
    method: 'PATCH',
    body: { muted_until: mutedUntil },
  });
  // Dùng cùng thời hạn đã lưu trong request chính; null là gỡ cấm viết nên không báo.
  if (mutedUntil) {
    await notifyAfter('muted', {
      targetUserId: userId, link: '/users/' + encodeURIComponent(userId), context: { muted_until: mutedUntil },
    });
  }
  return result;
}

/**
 * Ẩn hoặc hiện lại bài viết.
 * @param {string} postId Mã bài viết.
 * @param {'hidden'|'published'} status Trạng thái mới.
 * @param {object} options authorId và title là tác giả, tiêu đề bài đang quản trị.
 * @returns {Promise<object>} Bài sau khi cập nhật (PostResponse).
 */
export async function setPostStatus(postId, status, { authorId, title } = {}) {
  const result = await request('/manage/posts/' + encodeURIComponent(postId) + '/status', { method: 'PATCH', body: { status } });
  // Phản hồi quản trị vẫn có tác giả và tiêu đề khi bài vừa bị ẩn, không cần GET bài đã ẩn.
  if (status === 'hidden') {
    await notifyPostAfter('post_removed', postId, { authorId: authorId ?? result?.author_id, title: title ?? result?.title });
  }
  return result;
}

/**
 * Khôi phục bài đã bị xoá mềm.
 * @param {string} postId Mã bài viết.
 * @returns {Promise<object>} Bài sau khi khôi phục.
 */
export function restorePost(postId) {
  return request('/manage/posts/' + encodeURIComponent(postId) + '/restore', { method: 'POST' });
}

// CẦN BACKEND: GET /manage/posts/{id} (staff) trả bài ở mọi trạng thái, kể cả hidden và đã xoá, kèm deleted_at, để staff mở lại trang đọc bài của bài bị ẩn hoặc xoá. GET /posts/{id} hiện chỉ trả bài đang hiển thị.
/**
 * Đọc bài ở mọi trạng thái cho staff; null nghĩa là backend chưa hỗ trợ (trang báo không tìm thấy như người thường).
 * @param {string} postId Mã bài viết.
 * @returns {Promise<object|null>} Bài kèm status và deleted_at, hoặc null.
 */
export async function getPostForStaff(postId) {
  if (!backendSupports.manageGetPost) {
    return null;
  }
  return request('/manage/posts/' + encodeURIComponent(postId));
}

/**
 * Mọi bình luận của bài cho staff, kể cả đang ẩn và đã xoá (status, is_deleted).
 * @param {string} postId Mã bài viết.
 * @returns {Promise<Array>} CommentResponse[].
 */
export function listCommentsForStaff(postId) {
  return request('/manage/posts/' + encodeURIComponent(postId) + '/comments');
}

/**
 * Ẩn hoặc hiện lại bình luận.
 * @param {string} commentId Mã bình luận.
 * @param {'hidden'|'visible'} status Trạng thái mới.
 * @returns {Promise<object>} Bình luận sau khi cập nhật.
 */
export function setCommentStatus(commentId, status) {
  return request('/manage/comments/' + encodeURIComponent(commentId) + '/status', { method: 'PATCH', body: { status } });
}

/**
 * Khôi phục bình luận đã bị xoá mềm.
 * @param {string} commentId Mã bình luận.
 * @returns {Promise<object>} Bình luận sau khi khôi phục.
 */
export function restoreComment(commentId) {
  return request('/manage/comments/' + encodeURIComponent(commentId) + '/restore', { method: 'POST' });
}
