/** Dịch vụ thông báo dùng hàng đợi API chung; các hàm định dạng bên dưới không gọi mạng. */
import { request } from '/services/api/client.js';
import { routes } from '/utils/routes.js';
import { formatHandle } from '/utils/username.js';
import { initials } from '/utils/format.js';
import { isAllowedReaction } from '/services/api/reaction-emojis.js';

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
  follow: '{actor} đã bắt đầu theo dõi bạn',
  reaction: '{actor} đã bày tỏ cảm xúc {emoji} với bài viết của bạn',
  comment: '{actor} đã bình luận bài viết của bạn',
  reply: '{actor} đã trả lời bình luận của bạn',
  post_created: '{actor} vừa đăng bài mới: “{title}”',
  muted: '{actor} đã tạm khoá chức năng viết của bạn đến {date}',
  banned: '{actor} đã khoá tài khoản của bạn',
  post_locked: '{actor} đã khoá bình luận bài viết của bạn',
  post_removed: '{actor} đã gỡ bài viết “{title}” của bạn',
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

// CẦN BACKEND: GET /my/notifications chưa trả actor { id, displayname, username, avatar_url } và context { post_title, emoji, muted_until }; tạm tách tên từ câu tiếng Anh của máy chủ.
/** Tách thông điệp thành văn bản và tên in đậm; không đoán tên hoặc tiêu đề khi câu không khớp. */
export function formatNotification(notification) {
  const message = String(notification?.message ?? '');
  const kind = notification?.kind;
  const pattern = Object.hasOwn(messagePatterns, kind) ? messagePatterns[kind] : null;
  const match = pattern?.exec(message);
  const isSystem = ['muted', 'banned', 'post_locked', 'post_removed'].includes(kind);
  const fallback = { actorName: null, initials: '?', text: [{ text: message, strong: false }], isSystem, kind };
  if (!match) {
    return fallback;
  }
  const values = { ...match.groups };
  // Thời hạn dùng múi giờ của trình duyệt và định dạng dd/mm/yyyy hh:mm quen thuộc tại Việt Nam.
  if (kind === 'muted') {
    const date = new Date(values.date);
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }
    values.date = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  // Emoji trong câu do người gửi tự khai nên chỉ hiện khi đúng danh sách cho phép, tránh chèn chữ lạ vào thông báo.
  if (kind === 'reaction' && !isAllowedReaction(values.emoji)) {
    values.emoji = '';
  }
  // Chỉ tên người thực hiện được in đậm; nội dung còn lại luôn là text node khi dựng giao diện.
  const actorName = isSystem ? 'Quản trị viên'
    : notification.actor?.displayname
      || (notification.actor?.username ? formatHandle(notification.actor.username) : values.actor);
  values.actor = actorName;
  const suffix = notificationKindText[kind].replace('{actor}', '').replace(/\{(\w+)\}/gu, (placeholder, key) => values[key] ?? placeholder)
    // Ô trống (như emoji bị loại) để lại hai khoảng trắng liền nhau, gộp lại cho câu gọn.
    .replace(/ {2,}/gu, ' ');
  return {
    actorName, initials: isSystem ? 'QT' : initials(notification.actor?.displayname || notification.actor?.username || actorName), isSystem, kind,
    text: [{ text: actorName, strong: true }, { text: suffix, strong: false }],
  };
}

/** Giữ giao diện trả chuỗi cho các nơi gọi cũ; bộ dựng mới dùng các đoạn có cờ strong. */
export function notificationText(notification) {
  return formatNotification(notification).text.map(part => part.text).join('');
}
