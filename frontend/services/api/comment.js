/** Bình luận của bài viết: đọc, gửi, xoá và dịch, dùng cho trang đọc bài. */
import { request } from '/services/api/client.js';
import { backendSupports } from '/services/api/capabilities.js';
import { notifyAfter, notifyMentions, notifyPostAfter } from '/services/api/notify-actions.js';
import { sanitizeRichHtml, validateRichBytes } from '/utils/rich-text.js';
import { t } from '/utils/i18n.js';

/** Chỉ gửi toạ độ khi có đủ cặp số hợp lệ, tránh lưu nửa vị trí. */
function commentCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : {};
}

/**
 * Lấy mọi bình luận đang hiện của bài (API chưa phân trang, sắp cũ trước).
 * @param {string} postId Mã bài viết.
 * @returns {Promise<Array>} CommentResponse: id, parent_id, user_id, content, latitude, longitude, is_deleted, created_at.
 */
export function listComments(postId) {
  return request('/posts/' + encodeURIComponent(postId) + '/comments');
}

/**
 * Gửi bình luận mới; parentId để trả lời một bình luận khác.
 * @param {string} postId Mã bài viết.
 * @param {string} content Nội dung người dùng nhập.
 * @param {string|null} parentId Bình luận cha, mặc định null.
 * @param {object} options postAuthorId và parentAuthorId lấy từ dữ liệu trang để không tải lại.
 * @returns {Promise<object>} Bình luận vừa tạo.
 */
// CẦN BACKEND: place_name của bình luận có thể bổ sung sau; hiện chip địa điểm dựng từ latitude/longitude.
// CẦN BACKEND: thêm is_spoiler vào POST/GET comments; khi có dữ liệu, FE sẽ che chữ và có nút Hiện spoiler.
export async function createComment(postId, content, parentId = null, { postAuthorId, parentAuthorId, latitude, longitude } = {}) {
  const result = await request('/posts/' + encodeURIComponent(postId) + '/comments', {
    method: 'POST',
    body: { content, parent_id: parentId, ...commentCoordinates(latitude, longitude) },
  });
  // Trả lời chỉ báo cho chủ bình luận cha; bình luận gốc chỉ báo cho tác giả bài.
  if (parentId) {
    await notifyAfter('reply', async () => {
      const targetUserId = parentAuthorId ?? (await listComments(postId))?.find(comment => comment.id === parentId)?.user_id;
      return { targetUserId, link: '/posts/' + encodeURIComponent(postId) };
    });
  } else {
    await notifyPostAfter('comment', postId, { authorId: postAuthorId });
  }
  await notifyMentions({ commentId: result.id }, result.content ?? content);
  return result;
}

/**
 * Xoá mềm bình luận của chính mình (backend kiểm tra quyền).
 * @param {string} commentId Mã bình luận.
 * @returns {Promise<null>} Phản hồi rỗng khi thành công.
 */
export function deleteComment(commentId) {
  return request('/comments/' + encodeURIComponent(commentId), { method: 'DELETE' });
}

/** Sửa bình luận gồm HTML đã lọc và toạ độ đang gắn; không gửi toạ độ nghĩa là gỡ địa điểm khỏi bình luận. */
export async function updateComment(commentId, content, { latitude, longitude } = {}) {
  const safe = sanitizeRichHtml(content, { allowLinks: true });
  const error = validateRichBytes(safe, 10000, t('Bình luận'));
  if (error) throw new Error(error);
  const updated = await request('/comments/' + encodeURIComponent(commentId), {
    method: 'PATCH', body: { content: safe, ...commentCoordinates(latitude, longitude) },
  });
  // Máy chủ chống trùng nên người đã được nhắc từ trước không nhận thêm thông báo.
  await notifyMentions({ commentId }, updated?.content ?? safe);
  return updated;
}

/**
 * Dịch một bình luận sang ngôn ngữ giao diện của người đang đăng nhập (cần JWT).
 * @param {string} commentId Mã bình luận.
 * @returns {Promise<object>} { language, source_language, content, translated }.
 */
export function translateComment(commentId) {
  return request('/comments/' + encodeURIComponent(commentId) + '/translate', { method: 'POST' });
}

/**
 * Khoá hoặc mở khoá bình luận của một bài (tác giả với bài của mình, staff với mọi bài).
 * @param {string} postId Mã bài viết.
 * @param {boolean} locked true để khoá.
 * @param {object} options authorId là tác giả bài đã có trên trang.
 * @returns {Promise<object>} Bài sau khi cập nhật (có comments_locked).
 */
export async function setCommentsLocked(postId, locked, { authorId } = {}) {
  const result = await request('/posts/' + encodeURIComponent(postId) + '/comments/lock', { method: 'PATCH', body: { locked } });
  // Helper chỉ gửi khi staff khoá bài của người khác; mở khoá không gửi thông báo.
  if (locked) {
    await notifyPostAfter('post_locked', postId, { authorId: authorId ?? result?.author_id });
  }
  return result;
}

// CẦN BACKEND: GET /posts/{id}/comments nhúng author { id, displayname, username, avatar_url, native } vào mỗi bình luận, để trang không phải gọi GET /users/{id} cho từng người.
/**
 * Lấy tác giả đã nhúng trong bình luận nếu backend hỗ trợ; null thì trang tự tải hồ sơ.
 * @param {object} comment Bình luận từ API.
 * @returns {object|null} Tác giả nhúng hoặc null.
 */
export function getEmbeddedAuthor(comment) {
  return backendSupports.commentAuthors && comment?.author ? comment.author : null;
}
