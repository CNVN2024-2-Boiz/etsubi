/** Theo dõi thành viên qua API có sẵn, chỉ gọi sau khi trang kiểm tra phiên. */
import { request } from '/services/api/client.js';
import { notifyAfter } from '/services/api/notify-actions.js';

/** Theo dõi thành viên được gợi ý và chỉ cập nhật nút khi máy chủ báo thành công. */
export async function followUser(userId) {
  const result = await request('/users/' + encodeURIComponent(userId) + '/follow', { method: 'POST' });
  // Liên kết mở hồ sơ người vừa theo dõi, không phải hồ sơ người nhận.
  await notifyAfter('follow', actor => ({ targetUserId: userId, link: '/users/' + encodeURIComponent(actor.id) }));
  return result;
}

/** Bỏ theo dõi thành viên khi người dùng nhấn lại nút đang theo dõi. */
export function unfollowUser(userId) {
  return request('/users/' + encodeURIComponent(userId) + '/follow', { method: 'DELETE' });
}

/**
 * Hỏi người đang đăng nhập đã theo dõi một thành viên chưa (dùng cho nút ở thẻ "Về tác giả").
 * @param {string} userId Mã thành viên cần kiểm tra.
 * @returns {Promise<boolean>} true nếu đang theo dõi.
 */
export async function isFollowing(userId) {
  const result = await request('/my/following/' + encodeURIComponent(userId));
  return Boolean(result?.following);
}

/**
 * Lấy danh sách người theo dõi công khai; trang đọc bài đếm số phần tử để hiện "Người theo dõi".
 * @param {string} userId Mã thành viên.
 * @returns {Promise<Array>} Danh sách người theo dõi (API hiện không phân trang endpoint này).
 */
export function listFollowers(userId) {
  return request('/users/' + encodeURIComponent(userId) + '/followers');
}

/**
 * Lấy danh sách người mà một thành viên đang theo dõi (tab "Đang theo dõi" ở trang Hồ sơ).
 * @param {string} userId Mã thành viên.
 * @returns {Promise<Array>} Mỗi phần tử { id, displayname, username, avatar_url, bio }.
 */
export function listFollowing(userId) {
  return request('/users/' + encodeURIComponent(userId) + '/following');
}

/**
 * Người đang theo dõi chính mình (cần JWT); trang Hồ sơ dùng để biết ai cần nút "Theo dõi lại".
 * @returns {Promise<Array>} Mỗi phần tử { id, displayname, username, avatar_url, bio }.
 */
export function listMyFollowers() {
  return request('/my/followers');
}

/**
 * Người mình đang theo dõi (cần JWT); dùng để vẽ đúng trạng thái nút ở mọi dòng chỉ bằng một yêu cầu.
 * @returns {Promise<Array>} Mỗi phần tử { id, displayname, username, avatar_url, bio }.
 */
export function listMyFollowing() {
  return request('/my/following');
}

// CẦN BACKEND: danh sách followers/following đã có displayname; còn thiếu phân trang limit/offset và tổng số.
