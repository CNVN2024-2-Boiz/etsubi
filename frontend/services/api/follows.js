/** Theo dõi thành viên qua API có sẵn, chỉ gọi sau khi trang kiểm tra phiên. */
import { request } from '/services/api/client.js';

/** Theo dõi thành viên được gợi ý và chỉ cập nhật nút khi máy chủ báo thành công. */
export function followUser(userId) {
  return request('/users/' + encodeURIComponent(userId) + '/follow', { method: 'POST' });
}

/** Bỏ theo dõi thành viên khi người dùng nhấn lại nút đang theo dõi. */
export function unfollowUser(userId) {
  return request('/users/' + encodeURIComponent(userId) + '/follow', { method: 'DELETE' });
}
