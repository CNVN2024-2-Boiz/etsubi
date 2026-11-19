/** Đọc thống kê cảm xúc thật để số lượt thích của bảng tin không phải dữ liệu giả. */
import { request } from '/services/api/client.js';
import { notifyPostAfter } from '/services/api/notify-actions.js';
import { LIKE_EMOJI, REACTION_EMOJIS, isAllowedReaction } from '/services/api/reaction-emojis.js';
import { t } from '/utils/i18n.js';

// Trang đọc bài dùng một cảm xúc duy nhất cho nút thích trong Figma; xuất lại để nơi cũ không phải đổi import.
export { LIKE_EMOJI, REACTION_EMOJIS, isAllowedReaction };

/** Lấy từng loại cảm xúc và số lượng; trang cộng count tuần tự sau tác giả và tag. */
export function getReactionSummary(postId) {
  return request('/posts/' + encodeURIComponent(postId) + '/reactions/summary');
}

/**
 * Đọc cảm xúc của người đang đăng nhập với bài; trả null khi chưa thả (API báo 404).
 * @param {string} postId Mã bài viết.
 * @returns {Promise<object|null>} { emoji, reacted_at } hoặc null.
 */
export async function getMyReaction(postId) {
  try {
    return await request('/posts/' + encodeURIComponent(postId) + '/reactions/me');
  } catch (error) {
    // 404 nghĩa là người dùng chưa thả cảm xúc, không phải lỗi cần báo.
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Thả hoặc đổi cảm xúc cho bài (cần JWT).
 * @param {string} postId Mã bài viết.
 * @param {string} emoji Biểu tượng cảm xúc, mặc định là tim.
 * @param {object} options authorId là tác giả bài; previousEmoji là cảm xúc cũ hoặc null nếu chưa thả.
 * @returns {Promise<object>} Cảm xúc đã lưu.
 */
export async function reactToPost(postId, emoji = LIKE_EMOJI, { authorId, previousEmoji } = {}) {
  // Chặn từ phía trình duyệt mọi emoji ngoài danh sách; backend vẫn là chốt chặn cuối bằng CHECK constraint.
  if (!isAllowedReaction(emoji)) {
    throw Object.assign(new Error(t('Hiện chỉ hỗ trợ thả tim cho bài viết.')), { status: 400 });
  }
  emoji = emoji.trim();
  // Trang truyền cảm xúc cũ nếu đã tải; nơi khác chỉ cần đọc một lần để tránh thông báo khi gửi lại cùng emoji.
  let previous = previousEmoji;
  try {
    if (previous === undefined) {
      previous = (await getMyReaction(postId))?.emoji ?? null;
    }
  } catch {
    // Không biết trạng thái cũ thì vẫn lưu cảm xúc nhưng bỏ thông báo để tránh báo trùng.
  }
  const result = await request('/posts/' + encodeURIComponent(postId) + '/reactions', { method: 'POST', body: { emoji } });
  // Chỉ thêm hoặc đổi emoji mới gửi; removeReaction không có tác dụng phụ thông báo.
  if (previous !== undefined && previous !== emoji.trim()) {
    await notifyPostAfter('reaction', postId, { authorId, context: { emoji: result?.emoji ?? emoji.trim() } });
  }
  return result;
}

/**
 * Bỏ cảm xúc của mình khỏi bài (cần JWT).
 * @param {string} postId Mã bài viết.
 * @returns {Promise<null>} Phản hồi rỗng khi thành công.
 */
export function removeReaction(postId) {
  return request('/posts/' + encodeURIComponent(postId) + '/reactions', { method: 'DELETE' });
}
