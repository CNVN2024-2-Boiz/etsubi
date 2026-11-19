/** Trang thông báo dùng bộ dựng chung với panel và chỉ tải dữ liệu sau khi xác thực. */
import { requireAuth } from '/utils/auth.js';
import { qs } from '/utils/dom.js';
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { createNotificationFeed } from '/components/notification-menu/notification-menu.js';

// Một bộ huỷ theo vòng đời trang, không tạo polling hoặc listener riêng cho từng lần tải.
const events = new AbortController();
const { signal } = events;

/** Gắn thanh tác vụ và danh sách khi có phiên; người chưa đăng nhập được requireAuth chuyển hướng. */
async function init() {
  if (!await requireAuth()) return;
  const feed = createNotificationFeed({ signal, page: true });
  mountHeader(qs('[data-component="header"]'), { variant: 'notifications', notificationReadAll: feed.markAll });
  mountFooter();
  qs('[data-notifications-main]').replaceChildren(feed.element);
  void feed.load();
  void feed.refreshUnreadCount();
  // Trở lại tab chỉ tải lại tổng chưa đọc, giữ nguyên danh sách và vị trí đang đọc.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void feed.refreshUnreadCount();
  }, { signal });
  // Khi trình duyệt khôi phục từ bộ nhớ lịch sử, lấy lại tổng thật thay vì dùng số đã cũ.
  window.addEventListener('pageshow', event => {
    if (event.persisted) void feed.refreshUnreadCount();
  }, { signal });
}

// Giữ listener khi trang còn trong bfcache; chỉ huỷ khi thực sự rời vòng đời tài liệu.
window.addEventListener('pagehide', event => {
  if (!event.persisted) events.abort();
}, { signal });
void init();
