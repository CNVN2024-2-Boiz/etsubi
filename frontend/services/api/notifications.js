/** Dịch vụ thông báo dùng hàng đợi API chung; các hàm định dạng bên dưới không gọi mạng. */
import { request } from '/services/api/client.js';
import { routes } from '/utils/routes.js';

/** Đọc số thông báo chưa đọc của tài khoản hiện tại để cập nhật chuông. */
export function getUnreadCount() {
  return request('/my/notifications/unread-count');
}

/** Đọc một trang thông báo mới nhất; mặc định chỉ lấy 20 mục cho menu header. */
export function listNotifications({ limit = 20, offset = 0 } = {}) {
  return request('/my/notifications', { query: { limit, offset } });
}

/** Đánh dấu một thông báo đã đọc trước khi người dùng chuyển tới nội dung. */
export function markNotificationRead(id) {
  return request('/my/notifications/' + encodeURIComponent(id) + '/read', { method: 'PATCH' });
}

/** Đánh dấu toàn bộ thông báo đã đọc, kể cả các mục ngoài trang menu hiện tại. */
export function markAllNotificationsRead() {
  return request('/my/notifications/read-all', { method: 'POST' });
}

/** Xoá một thông báo theo mã; không tự thay đổi dữ liệu giao diện của nơi gọi. */
export function deleteNotification(id) {
  return request('/my/notifications/' + encodeURIComponent(id), { method: 'DELETE' });
}

/** Gửi thông báo với tên trường snake_case; máy chủ tự xác định người thực hiện từ JWT. */
export function createNotification({ kind, targetUserId, link, context }) {
  return request('/notifications', {
    method: 'POST', body: { kind, target_user_id: targetUserId, link, context },
  });
}

/** Báo bài viết mới cho người theo dõi; máy chủ kiểm tra JWT là tác giả bài viết. */
export function notifyFollowers(postId) {
  return request('/posts/' + encodeURIComponent(postId) + '/notify-followers', { method: 'POST' });
}

/** Chuyển duy nhất hai dạng liên kết máy chủ hỗ trợ sang trang nội bộ an toàn. */
export function notificationHref(link) {
  const match = typeof link === 'string' && link.match(/^\/(posts|users)\/([^/?#]+)$/u);
  if (!match) {
    return routes.home;
  }
  return match[1] === 'posts' ? routes.post(match[2]) : routes.userProfile(match[2]);
}

/** Bảng câu tiếng Việt theo loại; chỗ trống được điền bằng các nhóm khớp từ thông điệp máy chủ. */
export const notificationKindText = Object.freeze({
  follow: '{actor} đã theo dõi bạn',
  reaction: '{actor} đã bày tỏ {emoji} với bài viết của bạn',
  comment: '{actor} đã bình luận bài viết của bạn',
  reply: '{actor} đã trả lời bình luận của bạn',
  post_created: '{actor} vừa đăng bài: “{title}”',
  muted: 'Tài khoản của bạn bị tạm khoá chức năng viết đến {date}',
  banned: 'Tài khoản của bạn đã bị khoá',
  post_locked: 'Bình luận trong bài viết của bạn đã bị khoá',
  post_removed: 'Bài viết “{title}” của bạn đã bị gỡ',
});

// Biểu thức cố định bám theo câu tiếng Anh của API, không suy đoán tên hoặc tiêu đề khi câu không khớp.
const messagePatterns = Object.freeze({
  follow: /^(?<actor>.+) started following you$/u,
  reaction: /^(?<actor>.+) reacted (?<emoji>.+) to your post$/u,
  comment: /^(?<actor>.+) commented on your post$/u,
  reply: /^(?<actor>.+) replied to your comment$/u,
  post_created: /^New post from (?<actor>.+?): "(?<title>.*)"$/u,
  muted: /^Your account has been muted until (?<date>.+)$/u,
  banned: /^Your account has been banned$/u,
  post_locked: /^Comments on your post have been locked$/u,
  post_removed: /^Your post "(?<title>.*)" has been removed$/u,
});

/** Dịch câu theo kind và mẫu API; trả nguyên thông điệp khi không phân tích được để tránh mất nội dung. */
export function notificationText(notification) {
  const message = String(notification?.message ?? '');
  const kind = notification?.kind;
  const pattern = Object.hasOwn(messagePatterns, kind) ? messagePatterns[kind] : null;
  const match = pattern?.exec(message);
  if (!match) {
    return message;
  }
  const values = { ...match.groups };
  // Thời hạn dùng múi giờ của trình duyệt và định dạng dd/mm/yyyy hh:mm quen thuộc tại Việt Nam.
  if (kind === 'muted') {
    const date = new Date(values.date);
    if (Number.isNaN(date.getTime())) {
      return message;
    }
    values.date = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  // Mẫu và tên khoá do ứng dụng định nghĩa; dữ liệu trả về vẫn là văn bản, không phải HTML.
  return notificationKindText[kind].replace(/\{(\w+)\}/gu, (placeholder, key) => values[key] ?? placeholder);
}
