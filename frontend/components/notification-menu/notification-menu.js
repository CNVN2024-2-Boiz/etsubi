/** Danh sách thông báo dùng chung cho panel và trang riêng; dữ liệu động luôn được tạo bằng text node. */
import { el } from '/utils/dom.js';
import { relativeTime } from '/utils/format.js';
import {
  listNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead,
  deleteNotification, notificationHref, formatNotification,
} from '/services/api/notifications.js';

// Đường nét Lucide chuẩn khung 24, không dùng SVG xuất bị co méo hoặc icon font.
const iconPaths = Object.freeze({
  follow: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18-13v6m3-3h-6"/><circle cx="9" cy="7" r="4"/>',
  post_created: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/>',
  reaction: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>',
  comment: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  reply: '<path d="m9 10-5 5 5 5M4 15h11a5 5 0 0 0 0-10h-1"/>',
  muted: '<path d="m11 5-5 4H3v6h3l5 4Z"/><path d="m23 9-6 6m0-6 6 6"/>',
  banned: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  post_locked: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  post_removed: '<path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m4 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6m5 4v7m4-7v7"/>',
  x: '<path d="m18 6-12 12M6 6l12 12"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9m10.73 4a2 2 0 0 1-3.46 0"/>',
  'bell-off': '<path d="m3 3 18 18M10.58 3.12A6 6 0 0 1 18 9c0 2.1.27 3.56.66 4.6M6.26 6.26A6 6 0 0 0 6 8c0 7-3 9-3 9h14m-3.27 4a2 2 0 0 1-3.46 0"/>',
});

/** Tạo icon trang trí từ bảng đường nét cố định; tên không khớp dùng chuông trung tính. */
export function notificationIcon(name, size = 24) {
  const holder = el('span', { className: 'notification-icon', 'aria-hidden': 'true' });
  const path = Object.hasOwn(iconPaths, name) ? iconPaths[name] : iconPaths.bell;
  // size là hằng số của component, không đưa dữ liệu máy chủ vào chuỗi SVG.
  holder.innerHTML = '<svg viewBox="0 0 24 24" width="' + Number(size) + '" height="' + Number(size)
    + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  return holder;
}

/** Dựng một hàng có liên kết phủ khung và nút thao tác riêng, tránh lồng button vào a. */
export function createNotificationItem(notification, { signal, page = false, onFollow, onDelete, onMarkRead, onMenuOpen }) {
  const formatted = formatNotification(notification);
  const row = el('li', {
    className: 'notification-item' + (notification.is_readed ? '' : ' is-unread') + (page ? ' notification-item--page' : ''),
  });
  const avatar = el('span', {
    className: 'notification-item__avatar' + (formatted.isSystem ? ' notification-item__avatar--system' : ''),
    'aria-hidden': 'true',
  }, formatted.isSystem ? 'QT' : formatted.initials);
  // Chỉ dùng ảnh thật khi API đã cung cấp; ảnh lỗi trở về chữ, không gọi thêm API cho từng hàng.
  if (!formatted.isSystem && notification.actor?.avatar_url) {
    const image = el('img', { src: notification.actor.avatar_url, alt: formatted.actorName || '' });
    image.addEventListener('error', () => avatar.replaceChildren(formatted.initials), { once: true, signal });
    avatar.replaceChildren(image);
  }
  const badgeKind = formatted.isSystem ? 'system' : ['reaction', 'post_created'].includes(formatted.kind) ? formatted.kind : 'default';
  const avatarWrap = el('span', { className: 'notification-item__avatar-wrap' }, avatar,
    el('span', { className: 'notification-item__badge notification-item__badge--' + badgeKind }, notificationIcon(formatted.kind, 12)));
  const message = el('span', { className: 'notification-item__text' });
  // Mỗi đoạn được đưa qua el để ký tự HTML trong tên hoặc tiêu đề không thể thực thi.
  for (const part of formatted.text) {
    message.append(part.strong ? el('strong', {}, part.text) : document.createTextNode(part.text));
  }
  const link = el('a', { href: notificationHref(notification.link), className: 'notification-item__link' },
    avatarWrap, el('span', { className: 'notification-item__content' }, message,
      el('span', { className: 'u-visually-hidden', 'data-notification-unread-label': '' }, notification.is_readed ? '' : ' (Chưa đọc)'),
      el('span', { className: 'notification-item__time' }, relativeTime(notification.created_at))));
  // Click thường chờ đánh dấu rồi chuyển trang; tổ hợp mở tab mới vẫn giữ hành vi trình duyệt.
  link.addEventListener('click', event => { void onFollow(event, notification, link); }, { signal });
  link.addEventListener('auxclick', event => {
    if (event.button === 1) {
      void onFollow(event, notification, link);
    }
  }, { signal });
  const dot = el('span', { className: 'notification-item__dot', 'data-notification-dot': '', 'aria-hidden': 'true', hidden: notification.is_readed });
  const remove = el('button', { type: 'button', className: 'notification-item__delete', 'aria-label': 'Xoá thông báo' }, notificationIcon('x', 16));
  // Nút xoá độc lập với liên kết nên không vô tình điều hướng khi thao tác.
  remove.addEventListener('click', () => { void onDelete(notification, row); }, { signal });
  const trailing = el('div', { className: 'notification-item__trailing' }, dot, remove);
  row.append(link, trailing);
  // Trang riêng có nút chạm 40px và bảng thao tác; panel desktop chỉ dùng nút xoá khi hover/focus.
  if (page) {
    const more = el('button', { type: 'button', className: 'notification-item__more', 'aria-label': 'Thao tác thông báo', 'aria-expanded': 'false' }, notificationIcon('more'));
    const actions = el('div', { className: 'notification-item__actions', hidden: true });
    const read = el('button', { type: 'button', className: 'notification-item__action', 'data-notification-read-action': '', hidden: notification.is_readed }, 'Đánh dấu đã đọc');
    const erase = el('button', { type: 'button', className: 'notification-item__action' }, 'Xoá');
    actions.append(read, erase);
    // Controller đóng bảng trước đó và quản lý click ngoài/Escape chung cho cả danh sách.
    more.addEventListener('click', () => onMenuOpen({ row, more, actions }), { signal });
    read.addEventListener('click', () => { void onMarkRead(notification, row); }, { signal });
    erase.addEventListener('click', () => { void onDelete(notification, row); }, { signal });
    trailing.append(more, actions);
  }
  return row;
}

/** Dựng bốn hàng chờ tĩnh, giữ aria-busy trên vùng danh sách thay cho hiệu ứng tải. */
function loadingRows() {
  const container = el('div', { 'aria-hidden': 'true' });
  // Thanh xám chỉ giữ chỗ cho nội dung, không giả tên hay thời gian chưa có dữ liệu.
  for (let index = 0; index < 4; index++) {
    container.append(el('div', { className: 'notification-loading' },
      el('span', { className: 'notification-loading__avatar' }),
      el('div', { className: 'notification-loading__bars' },
        el('span', { className: 'u-placeholder-bar notification-loading__bar' }),
        el('span', { className: 'u-placeholder-bar notification-loading__bar--middle' }),
        el('span', { className: 'u-placeholder-bar notification-loading__bar--short' }))));
  }
  return container;
}

/** Quản lý phân trang và trạng thái dùng chung; header có thể truyền hàm cập nhật chấm để dùng một request. */
export function createNotificationFeed({ signal, page = false, onRead, onCountChange = () => {} } = {}) {
  signal ??= new AbortController().signal;
  let renderEvents = null;
  let notifications = [];
  let unreadCount = 0;
  let offset = 0;
  let hasMore = false;
  let loading = false;
  let loadFailed = false;
  let actionBusy = false;
  let version = 0;
  let countVersion = 0;
  let openedActions = null;
  const limit = 10;
  const element = el('div', { className: 'notification-feed' });
  const list = el('div', { className: 'notification-menu__list', 'aria-busy': 'false', tabindex: -1 });
  const status = el('p', { className: 'notification-menu__status', role: 'alert', hidden: true });
  const markAll = el('button', { type: 'button', className: 'notification-menu__action', disabled: true }, 'Đánh dấu tất cả đã đọc');
  const chip = el('span', { className: 'notification-menu__chip', hidden: true });
  const more = el('button', { type: 'button', className: 'notification-menu__more' }, 'Xem thêm thông báo');
  const footer = el('div', { className: 'notification-menu__footer', hidden: true }, more);
  element.append(status, list, footer);

  /** Đồng bộ chip, nút đọc hết và nút phân trang từ dữ liệu thật, không đếm riêng một trang làm tổng. */
  function updateControls() {
    chip.textContent = unreadCount + ' mới';
    chip.hidden = unreadCount === 0 || loadFailed;
    markAll.disabled = unreadCount === 0 || loading || actionBusy || loadFailed;
    markAll.classList.toggle('is-loading', loading);
    footer.hidden = !hasMore;
    more.disabled = loading || actionBusy;
    more.textContent = loading ? 'Đang tải…' : 'Xem thêm thông báo';
    // Khoá cả nút từng hàng trong lúc ghi hoặc tải để người dùng không gửi thao tác trùng.
    for (const button of list.querySelectorAll('li button')) button.disabled = loading || actionBusy;
  }

  /** Nhận tổng mới từ header hoặc API và báo cho nút Đọc hết trên thanh trang riêng. */
  function setUnreadCount(count) {
    unreadCount = Number.isFinite(count) ? Math.max(0, count) : 0;
    updateControls();
    onCountChange(unreadCount);
  }

  /** Hiện lỗi thao tác mà vẫn giữ danh sách đã tải để người dùng tiếp tục đọc. */
  function showStatus(message = '') {
    status.textContent = message;
    status.hidden = !message;
  }

  /** Làm mới tổng sau đọc/xoá; kết quả cũ không ghi đè yêu cầu mới, lỗi làm chip và chấm biến mất. */
  async function refreshUnreadCount() {
    // Không tạo yêu cầu từ header hoặc trang đã bị huỷ trong lúc thao tác trước còn chờ.
    if (signal.aborted) return;
    const current = ++countVersion;
    let count = 0;
    try {
      // Header tự đặt tổng bằng setUnreadCount, không ghi đè kết quả khi callback cũ bị bỏ qua.
      if (onRead) {
        await onRead();
        return;
      }
      const result = await getUnreadCount();
      count = result?.count;
    } catch {
      // Không tự thử lại để tránh dồn yêu cầu khi mất kết nối.
    }
    if (!signal.aborted && current === countVersion) {
      setUnreadCount(count);
    }
  }

  /** Đóng bảng thao tác nhỏ, tuỳ chọn trả focus về nút đã mở khi nhấn Escape. */
  function closeActions(restoreFocus = false) {
    if (!openedActions) return;
    openedActions.actions.hidden = true;
    openedActions.more.setAttribute('aria-expanded', 'false');
    if (restoreFocus) openedActions.more.focus();
    openedActions = null;
  }

  /** Chỉ mở một bảng thao tác mỗi lần để các hàng không che lẫn nhau trên điện thoại. */
  function onMenuOpen(target) {
    const open = target.actions.hidden;
    closeActions();
    if (open) {
      openedActions = target;
      target.actions.hidden = false;
      target.more.setAttribute('aria-expanded', 'true');
      target.actions.querySelector('button:not([hidden])')?.focus();
    }
  }

  /** Dựng danh sách hoặc trạng thái rỗng đúng thiết kế; huỷ listener cũ sau mỗi lần thay hàng. */
  function renderItems() {
    closeActions();
    renderEvents?.abort();
    renderEvents = new AbortController();
    if (!notifications.length) {
      list.replaceChildren(el('div', { className: 'notification-menu__empty', role: 'status' },
        el('span', { className: 'notification-menu__empty-icon' }, notificationIcon('bell-off', 22)),
        el('p', { className: 'notification-menu__empty-title' }, 'Chưa có thông báo'),
        el('p', { className: 'notification-menu__empty-copy' }, 'Khi có người theo dõi, bình luận hay bày tỏ cảm xúc với bài viết của bạn, thông báo sẽ hiện ở đây.')));
      return;
    }
    const items = el('ul', { className: 'notification-menu__items' });
    // Tái sử dụng một bộ dựng để thời gian, avatar, icon và trạng thái giống nhau ở hai nơi.
    for (const notification of notifications) {
      items.append(createNotificationItem(notification, {
        signal: renderEvents.signal, page, onFollow, onDelete, onMarkRead, onMenuOpen,
      }));
    }
    list.replaceChildren(items);
    updateControls();
  }

  /** Tải một trang 10 mục; lỗi trang tiếp theo vẫn giữ các mục trước và nút thử lại. */
  async function load(append = false) {
    if (loading || actionBusy || signal.aborted) return;
    const current = ++version;
    loading = true;
    loadFailed = false;
    showStatus();
    list.setAttribute('aria-busy', 'true');
    if (!append) {
      closeActions();
      renderEvents?.abort();
      list.replaceChildren(el('span', { className: 'u-visually-hidden', role: 'status' }, 'Đang tải…'), loadingRows());
      hasMore = false;
    }
    updateControls();
    try {
      const result = await listNotifications({ limit, offset: append ? offset : 0 });
      if (signal.aborted || current !== version) return;
      if (!Array.isArray(result)) throw new Error('Invalid notifications');
      const batch = result.slice(0, limit);
      // Offset theo số mục máy chủ trả, không theo số hàng còn lại sau khi xoá.
      offset = (append ? offset : 0) + batch.length;
      const existing = new Set(append ? notifications.map(item => item.id) : []);
      notifications = (append ? notifications : []).concat(batch.filter(item => !existing.has(item.id)));
      hasMore = batch.length === limit;
      renderItems();
    } catch {
      if (signal.aborted || current !== version) return;
      if (append) {
        showStatus('Không tải được thông báo. Vui lòng kiểm tra kết nối và thử lại.');
      } else {
        // Lỗi lượt đầu vô hiệu hoá Đọc hết dù yêu cầu tổng chưa đọc hoàn thành sau đó.
        loadFailed = true;
        const retry = el('button', { type: 'button', className: 'btn btn--secondary' }, 'Thử lại');
        // Người dùng chủ động thử lại, không có polling hoặc vòng lặp tải nền.
        retry.addEventListener('click', () => { void load(); void refreshUnreadCount(); }, { signal });
        list.replaceChildren(el('div', { className: 'notification-menu__error', role: 'alert' },
          el('p', {}, 'Không tải được thông báo. Vui lòng kiểm tra kết nối và thử lại.'), retry));
      }
      // Lỗi danh sách không có nghĩa tổng chưa đọc bằng 0; giữ kết quả thật từ API tổng.
    } finally {
      if (!signal.aborted && current === version) {
        loading = false;
        list.setAttribute('aria-busy', 'false');
        updateControls();
      }
    }
  }

  /** Đánh dấu trước khi mở nội dung; lỗi không chặn liên kết, kể cả thao tác mở tab mới. */
  async function onFollow(event, notification, link) {
    if (notification.is_readed || event.defaultPrevented) return;
    const navigateHere = event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
    if (navigateHere) event.preventDefault();
    if (link.dataset.marking) return;
    link.dataset.marking = 'true';
    try {
      await markNotificationRead(notification.id);
      notification.is_readed = true;
      // Cập nhật chính hàng hiện tại để giữ nguyên hành vi mở tab và focus của liên kết.
      const row = link.closest('li');
      row?.classList.remove('is-unread');
      const dot = row?.querySelector('[data-notification-dot]');
      if (dot) dot.hidden = true;
      const unreadLabel = row?.querySelector('[data-notification-unread-label]');
      if (unreadLabel) unreadLabel.textContent = '';
      const readAction = row?.querySelector('[data-notification-read-action]');
      if (readAction) readAction.hidden = true;
    } catch {
      // Nội dung vẫn mở được khi API đánh dấu không phản hồi.
    } finally {
      await refreshUnreadCount();
      delete link.dataset.marking;
      if (navigateHere && !signal.aborted) location.assign(link.href);
    }
  }

  /** Thực hiện xoá hoặc đánh dấu tại chỗ; khoá thao tác song song để offset không bị lệch. */
  async function changeItem(notification, row, remove) {
    if (actionBusy || loading || signal.aborted) return;
    actionBusy = true;
    closeActions();
    updateControls();
    row.setAttribute('aria-busy', 'true');
    showStatus();
    try {
      await (remove ? deleteNotification(notification.id) : markNotificationRead(notification.id));
      if (signal.aborted) return;
      // Xoá làm các bản ghi phía sau dịch lên một vị trí trong phân trang offset.
      if (remove) {
        notifications = notifications.filter(item => item.id !== notification.id);
        offset = Math.max(0, offset - 1);
      } else {
        notification.is_readed = true;
      }
      const index = Array.from(row.parentNode.children).indexOf(row);
      renderItems();
      const links = list.querySelectorAll('a');
      (links[Math.min(index, links.length - 1)] || list).focus();
    } catch {
      showStatus(remove ? 'Không xoá được thông báo. Vui lòng thử lại.' : 'Không đánh dấu được thông báo. Vui lòng thử lại.');
    } finally {
      await refreshUnreadCount();
      actionBusy = false;
      row.removeAttribute('aria-busy');
      updateControls();
    }
  }

  /** Nối nút xoá của cả hai giao diện vào cùng thao tác có xử lý lỗi. */
  function onDelete(notification, row) { return changeItem(notification, row, true); }

  /** Nối nút đánh dấu của bảng thao tác di động vào cùng bộ cập nhật. */
  function onMarkRead(notification, row) { return changeItem(notification, row, false); }

  /** Đọc hết trên máy chủ rồi đồng bộ các hàng và lấy lại tổng để không bỏ sót thông báo mới. */
  async function readAll() {
    if (markAll.disabled || signal.aborted) return;
    actionBusy = true;
    closeActions();
    showStatus();
    updateControls();
    try {
      await markAllNotificationsRead();
      if (signal.aborted) return;
      // Chỉ thay trạng thái sau khi máy chủ xác nhận thành công.
      for (const notification of notifications) notification.is_readed = true;
      renderItems();
    } catch {
      showStatus('Không đánh dấu được thông báo. Vui lòng thử lại.');
    } finally {
      await refreshUnreadCount();
      actionBusy = false;
      updateControls();
    }
  }

  /** Huỷ phản hồi cũ khi đóng panel để lần mở kế tiếp luôn có thể tải lại. */
  function cancelLoad() {
    version++;
    loading = false;
    closeActions();
  }

  // Vòng đời component huỷ cả listener hàng; không để listener của các trang cũ tồn tại.
  signal.addEventListener('abort', () => { cancelLoad(); renderEvents?.abort(); }, { once: true });
  markAll.addEventListener('click', readAll, { signal });
  more.addEventListener('click', () => { void load(true); }, { signal });
  // Dùng composedPath vì click thao tác có thể thay DOM trước khi nổi bọt lên document.
  document.addEventListener('click', event => {
    if (openedActions && !event.composedPath().includes(openedActions.row)) closeActions();
  }, { signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeActions(true);
  }, { signal });
  return { element, markAll, chip, load, readAll, refreshUnreadCount, setUnreadCount, cancelLoad };
}

/** Bao danh sách dùng chung trong panel có heading nhận focus và chip tổng chưa đọc. */
export function createNotificationMenu({ id, signal, onRead }) {
  const feed = createNotificationFeed({ signal, onRead });
  const heading = el('h2', { id: id + '-title', tabindex: -1 }, 'Thông báo');
  const element = el('section', { id, className: 'notification-menu', hidden: true, 'aria-labelledby': id + '-title' },
    el('div', { className: 'notification-menu__heading' }, heading, feed.chip,
      el('span', { className: 'notification-menu__spacer', 'aria-hidden': 'true' }), feed.markAll), feed.element);
  /** Hiện panel, chuyển focus đến tiêu đề và tải dữ liệu mới khi người dùng mở. */
  function open() {
    element.hidden = false;
    heading.focus();
    void feed.load();
    void feed.refreshUnreadCount();
  }
  /** Ẩn panel và bỏ hiệu lực phản hồi của lượt tải cũ; header chịu trách nhiệm trả focus. */
  function close() {
    element.hidden = true;
    feed.cancelLoad();
  }
  return { element, open, close, setUnreadCount: feed.setUnreadCount };
}
