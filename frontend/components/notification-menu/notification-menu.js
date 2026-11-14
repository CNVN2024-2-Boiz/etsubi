/** Menu thông báo chỉ tải khi mở; header quản lý đóng menu và trả focus về chuông. */
import { el } from '/utils/dom.js';
import { relativeTime } from '/utils/format.js';
import {
  listNotifications, markNotificationRead, markAllNotificationsRead,
  notificationHref, notificationText,
} from '/services/api/notifications.js';

/** Tạo menu có vòng đời chung với header; báo lại số chưa đọc sau thao tác thành công. */
export function createNotificationMenu({ id, signal, onRead }) {
  let notifications = [];
  let unreadCount = 0;
  let loading = false;
  let markingAll = false;
  let loadVersion = 0;
  const element = el('section', {
    id, className: 'notification-menu', hidden: true, 'aria-labelledby': id + '-title',
  });
  const markAll = el('button', {
    type: 'button', className: 'notification-menu__action', disabled: true,
  }, 'Đánh dấu đã đọc');
  const list = el('div', { className: 'notification-menu__list', 'aria-busy': 'false' });
  const status = el('p', { className: 'notification-menu__status', role: 'status', hidden: true });
  element.append(el('div', { className: 'notification-menu__heading' },
    el('h2', { id: id + '-title' }, 'Thông báo'), markAll), status, list);

  /** Khoá thao tác khi chưa có thông báo chưa đọc hoặc đang tải, tránh gửi lặp yêu cầu. */
  function updateControls() {
    // Danh sách có thể vừa nhận mục mới trước lần đọc tổng tiếp theo, nên vẫn cho đánh dấu các mục đó.
    const hasUnread = unreadCount > 0 || notifications.some(notification => !notification.is_readed);
    markAll.disabled = !hasUnread || loading || markingAll;
  }

  /** Nhận số thật từ header, không suy ra tổng chưa đọc chỉ từ 20 mục đang hiển thị. */
  function setUnreadCount(count) {
    unreadCount = count;
    updateControls();
  }

  /** Hiện lỗi thao tác trong menu để người dùng vẫn xem được danh sách đã tải. */
  function showStatus(message = '') {
    status.textContent = message;
    status.hidden = !message;
  }

  /** Đánh dấu mục đã đọc trước khi chuyển trang; lỗi đánh dấu không chặn việc mở nội dung. */
  async function followNotification(event, notification, link) {
    if (notification.is_readed || event.defaultPrevented) {
      return;
    }
    // Click thường chờ PATCH; tổ hợp mở tab mới giữ hành vi mặc định và vẫn gửi đánh dấu.
    const navigateHere = event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
    if (navigateHere) {
      event.preventDefault();
    }
    if (link.dataset.marking === 'true') {
      return;
    }
    link.dataset.marking = 'true';
    try {
      await markNotificationRead(notification.id);
      notification.is_readed = true;
      if (!signal.aborted) {
        renderItems();
        onRead();
      }
    } catch {
      // Đường dẫn nội bộ vẫn dùng được khi API đánh dấu tạm thời không phản hồi.
    } finally {
      delete link.dataset.marking;
      if (navigateHere && !signal.aborted) {
        location.assign(link.href);
      }
    }
  }

  /** Dựng các liên kết bằng text node để tên và tiêu đề API không thể chèn HTML. */
  function renderItems() {
    list.replaceChildren();
    if (!notifications.length) {
      list.append(el('p', { className: 'notification-menu__placeholder' }, 'Chưa có thông báo'));
      return;
    }
    const items = el('ul', { className: 'notification-menu__items' });
    // Mỗi thông báo có dấu chưa đọc riêng và thời gian tương đối dùng chung với bài viết.
    for (const notification of notifications) {
      const link = el('a', {
        href: notificationHref(notification.link),
        className: 'notification-menu__item' + (notification.is_readed ? '' : ' is-unread'),
      },
      el('span', { className: 'notification-menu__dot', 'aria-hidden': 'true' }),
      el('span', { className: 'notification-menu__content' },
        el('span', { className: 'notification-menu__text' }, notificationText(notification)),
        el('span', { className: 'u-visually-hidden' }, notification.is_readed ? '' : ' (Chưa đọc)'),
        el('span', { className: 'notification-menu__time' }, relativeTime(notification.created_at))));
      // Cả click bàn phím và chuột đều đi qua cùng thao tác đánh dấu trước khi mở nội dung.
      link.addEventListener('click', event => { void followNotification(event, notification, link); }, { signal });
      link.addEventListener('auxclick', event => {
        if (event.button === 1) {
          void followNotification(event, notification, link);
        }
      }, { signal });
      items.append(el('li', {}, link));
    }
    list.append(items);
  }

  /** Tải tối đa 20 mục mỗi lần mở; số phiên ngăn phản hồi cũ thay danh sách của lần mở mới. */
  async function load() {
    const version = ++loadVersion;
    loading = true;
    showStatus();
    list.setAttribute('aria-busy', 'true');
    list.replaceChildren(el('p', { className: 'notification-menu__placeholder', role: 'status' }, 'Đang tải…'));
    updateControls();
    try {
      const result = await listNotifications();
      if (signal.aborted || version !== loadVersion) {
        return;
      }
      notifications = result.slice(0, 20);
      renderItems();
    } catch {
      if (signal.aborted || version !== loadVersion) {
        return;
      }
      const retry = el('button', { type: 'button', className: 'notification-menu__action' }, 'Thử lại');
      // Chỉ thử lại sau thao tác chủ động, không tạo vòng lặp gọi API khi lỗi mạng.
      retry.addEventListener('click', load, { signal });
      list.replaceChildren(el('div', { className: 'notification-menu__placeholder', role: 'status' },
        el('p', {}, 'Không tải được thông báo.'), retry));
    } finally {
      if (!signal.aborted && version === loadVersion) {
        loading = false;
        list.setAttribute('aria-busy', 'false');
        updateControls();
      }
    }
  }

  /** Đánh dấu toàn bộ trên máy chủ rồi đồng bộ các mục đang xem và số trên chuông. */
  async function readAll() {
    if (markAll.disabled) {
      return;
    }
    markingAll = true;
    updateControls();
    showStatus();
    try {
      await markAllNotificationsRead();
      if (signal.aborted) {
        return;
      }
      // API đã xác nhận nên mọi mục đang hiển thị đều được chuyển sang trạng thái đã đọc.
      for (const notification of notifications) {
        notification.is_readed = true;
      }
      setUnreadCount(0);
      renderItems();
      onRead();
    } catch {
      if (!signal.aborted) {
        showStatus('Không đánh dấu được thông báo. Vui lòng thử lại.');
      }
    } finally {
      markingAll = false;
      updateControls();
    }
  }

  /** Mở menu và đọc dữ liệu mới; trạng thái tải chỉ là chữ tĩnh. */
  function open() {
    element.hidden = false;
    void load();
  }

  /** Đóng menu và vô hiệu hoá phản hồi tải đang chờ để không ghi đè lần mở tiếp theo. */
  function close() {
    element.hidden = true;
    loadVersion++;
  }

  // Listener được huỷ cùng header để các lần dựng lại không giữ menu cũ trong bộ nhớ.
  markAll.addEventListener('click', readAll, { signal });
  return { element, open, close, setUnreadCount };
}
