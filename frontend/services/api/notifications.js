import { richToPlainText } from '/utils/rich-text.js';
/** Dịch vụ thông báo dùng hàng đợi API chung; các hàm định dạng bên dưới không gọi mạng. */
import { request } from '/services/api/client.js';
import { routes } from '/utils/routes.js';
import { formatHandle } from '/utils/username.js';
import { initials } from '/utils/format.js';
import { isAllowedReaction } from '/services/api/reaction-emojis.js';
import { t } from '/utils/i18n.js';

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

/** Gửi danh sách tên được nhắc; máy chủ bỏ qua tên không tồn tại và không báo trùng cho cùng một nội dung. */
export function createMentions({ postId, commentId, usernames }) {
  return request('/notifications/mention', {
    method: 'POST', body: { ...(commentId ? { comment_id: commentId } : { post_id: postId }), mentioned_usernames: usernames },
  });
}

// Mã bình luận trong link luôn là UUID; dạng khác bị coi là link không hợp lệ.
const POST_LINK = /^\/posts\/([^/?#]+)(?:#comment-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?$/iu;
const USER_LINK = /^\/users\/([^/?#]+)$/u;

/** Chỉ nhận link bài viết (có thể kèm #comment-{uuid}) và link hồ sơ, mọi dạng khác về Trang chủ. */
export function notificationHref(link) {
  if (typeof link !== 'string') {
    return routes.home;
  }
  const post = link.match(POST_LINK);
  if (post) {
    return routes.post(post[1]) + (post[2] ? '#comment-' + post[2].toLowerCase() : '');
  }
  const user = link.match(USER_LINK);
  return user ? routes.userProfile(user[1]) : routes.home;
}

/** Bảng câu tiếng Việt theo loại; chỗ trống được điền bằng các nhóm khớp từ thông điệp máy chủ. */
export const notificationKindText = Object.freeze({
  follow: t('{actor} đã bắt đầu theo dõi bạn'),
  reaction: t('{actor} đã bày tỏ cảm xúc {emoji} với bài viết của bạn'),
  comment: t('{actor} đã bình luận bài viết của bạn'),
  reply: t('{actor} đã trả lời bình luận của bạn'),
  mention: t('{actor} đã nhắc đến bạn'),
  post_created: t('{actor} vừa đăng bài mới: “{title}”'),
  muted: t('{actor} đã tạm khoá chức năng viết của bạn đến {date}'),
  banned: t('{actor} đã khoá tài khoản của bạn'),
  post_locked: t('{actor} đã khoá bình luận bài viết của bạn'),
  post_removed: t('{actor} đã gỡ bài viết “{title}” của bạn'),
});

// Biểu thức cố định bám theo câu tiếng Anh của API, không suy đoán tên hoặc tiêu đề khi câu không khớp.
const messagePatterns = Object.freeze({
  follow: /^(?<actor>.+) started following you$/u,
  reaction: /^(?<actor>.+) reacted (?<emoji>.+) to your post$/u,
  comment: /^(?<actor>.+) commented on your post$/u,
  reply: /^(?<actor>.+) replied to your comment$/u,
  mention: /^(?<actor>.+) mentioned you$/u,
  post_created: /^New post from (?<actor>.+?): "(?<title>.*)"$/u,
  muted: /^Your account has been muted until (?<date>.+)$/u,
  banned: /^Your account has been banned$/u,
  post_locked: /^Comments on your post have been locked$/u,
  post_removed: /^Your post "(?<title>.*)" has been removed$/u,
});

/** Gom các trường actor_* phẳng của API; dữ liệu cũ không có thì để trống và dùng tên trong message. */
function notificationActor(notification) {
  const nested = notification?.actor;
  return {
    username: notification?.actor_username || nested?.username || null,
    displayname: notification?.actor_displayname || nested?.displayname || null,
    avatarUrl: notification?.actor_avatar_url || nested?.avatar_url || null,
  };
}

/** Tách thông điệp thành văn bản và tên in đậm; không đoán tên hoặc tiêu đề khi câu không khớp. */
export function formatNotification(notification) {
  const message = String(notification?.message ?? '');
  const kind = notification?.kind;
  const pattern = Object.hasOwn(messagePatterns, kind) ? messagePatterns[kind] : null;
  const match = pattern?.exec(message);
  const isSystem = ['muted', 'banned', 'post_locked', 'post_removed'].includes(kind);
  const actor = notificationActor(notification);
  const fallback = {
    actorName: null, initials: actor.displayname || actor.username ? initials(actor.displayname || actor.username) : '?',
    avatarUrl: isSystem ? null : actor.avatarUrl, text: [{ text: message, strong: false }], isSystem, kind,
  };
  if (!match) {
    return fallback;
  }
  const values = { ...match.groups };
  // Tiêu đề trong thông báo luôn là chữ thuần, kể cả khi client khác gửi HTML.
  if (values.title) values.title = richToPlainText(values.title);
  // Thời hạn dùng múi giờ của trình duyệt và định dạng dd/mm/yyyy hh:mm quen thuộc tại Việt Nam.
  if (kind === 'muted') {
    const date = new Date(values.date);
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }
    values.date = date.toLocaleDateString(currentLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + date.toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  // Emoji trong câu do người gửi tự khai nên chỉ hiện khi đúng danh sách cho phép, tránh chèn chữ lạ vào thông báo.
  if (kind === 'reaction' && !isAllowedReaction(values.emoji)) {
    values.emoji = '';
  }
  // Chỉ tên người thực hiện được in đậm; nội dung còn lại luôn là text node khi dựng giao diện.
  const actorName = isSystem ? t('Quản trị viên')
    : actor.displayname || (actor.username ? formatHandle(actor.username) : values.actor);
  values.actor = actorName;
  const suffix = notificationKindText[kind].replace('{actor}', '').replace(/\{(\w+)\}/gu, (placeholder, key) => values[key] ?? placeholder)
    // Ô trống (như emoji bị loại) để lại hai khoảng trắng liền nhau, gộp lại cho câu gọn.
    .replace(/ {2,}/gu, ' ');
  return {
    actorName, initials: isSystem ? 'QT' : initials(actor.displayname || actor.username || actorName),
    avatarUrl: isSystem ? null : actor.avatarUrl, isSystem, kind,
    text: [{ text: actorName, strong: true }, { text: suffix, strong: false }],
  };
}

/** Giữ giao diện trả chuỗi cho các nơi gọi cũ; bộ dựng mới dùng các đoạn có cờ strong. */
export function notificationText(notification) {
  return formatNotification(notification).text.map(part => part.text).join('');
}
