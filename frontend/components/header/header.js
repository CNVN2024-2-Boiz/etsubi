/** Thanh điều hướng dùng chung cho mọi trang; quản lý menu, phiên và phím tắt tìm kiếm. */
import { getAuthorLabel, getAuthorHandle } from '/services/api/posts.js';
import { el, qs } from '/utils/dom.js';
import { routes, searchUrl, withRedirect } from '/utils/routes.js';
import { getCachedUser, fetchCurrentUser, logout } from '/utils/auth.js';
// Guard dùng chung cho các trang có dữ liệu chưa lưu, không import trực tiếp trang Cài đặt.
import { confirmLeave } from '/utils/leave-guard.js';
import { createLanguageMenu } from '/components/header/language-menu.js';
import { initials } from '/utils/format.js';
import { getUnreadCount } from '/services/api/notifications.js';
import { createNotificationMenu, notificationIcon } from '/components/notification-menu/notification-menu.js';

// Lưu bộ huỷ theo vùng gắn để dựng lại header không nhân đôi bộ lắng nghe.
const mounts = new WeakMap();
let headerCount = 0;
const items = [
  ['home', 'Trang chủ'],
  ['forum', 'Diễn đàn'],
  ['support', 'Hỗ trợ'],
  ['about', 'Giới thiệu'],
];

/** Tạo ảnh biểu tượng cố định với alt rỗng vì nút hoặc liên kết đã có tên truy cập. */
function icon(name) {
  return el('img', {
    src: '/assets/icons/' + name + '.svg',
    alt: '',
    width: 24,
    height: 24,
  });
}

/** Tạo icon Lucide cố định theo màu chữ để các mục tài khoản có trạng thái hover đồng nhất. */
function profileIcon(name) {
  const paths = {
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 1.72l-.12.85a2 2 0 0 1-1.18 1.52l-.26.12a2 2 0 0 1-1.9-.18l-.7-.54a2 2 0 0 0-2.62.72l-.22.38a2 2 0 0 0 .46 2.68l.72.55a2 2 0 0 1 .78 1.76v.28a2 2 0 0 1-.78 1.76l-.72.55a2 2 0 0 0-.46 2.68l.22.38a2 2 0 0 0 2.62.72l.7-.54a2 2 0 0 1 1.9-.18l.26.12a2 2 0 0 1 1.18 1.52l.12.85a2 2 0 0 0 2 1.72h.44a2 2 0 0 0 2-1.72l.12-.85a2 2 0 0 1 1.18-1.52l.26-.12a2 2 0 0 1 1.9.18l.7.54a2 2 0 0 0 2.62-.72l.22-.39a2 2 0 0 0-.46-2.68l-.72-.54a2 2 0 0 1-.78-1.76v-.28a2 2 0 0 1 .78-1.76l.72-.55a2 2 0 0 0 .46-2.68l-.22-.38a2 2 0 0 0-2.62-.72l-.7.54a2 2 0 0 1-1.9.18l-.26-.12a2 2 0 0 1-1.18-1.52l-.12-.85a2 2 0 0 0-2-1.72Z"/><circle cx="12" cy="12" r="3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  };
  const holder = document.createElement('template');
  // Chỉ chèn đường nét cố định nội bộ, không ghép dữ liệu API vào SVG.
  holder.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
  return holder.content.firstElementChild;
}

/** Dùng cùng ảnh hoặc chữ viết tắt ở nút header và đầu panel, ảnh lỗi thì trả về chữ. */
function fillAvatar(target, user, signal) {
  const name = getAuthorLabel(user) || '–';
  target.replaceChildren(initials(user.displayname || user.username));
  if (user.avatarUrl) {
    const image = el('img', { src: user.avatarUrl, alt: name });
    // Gỡ ảnh hỏng một lần để không tạo yêu cầu lặp và vẫn nhận diện được tài khoản.
    image.addEventListener('error', () => {
      target.replaceChildren(initials(user.displayname || user.username));
    }, { once: true, signal });
    target.replaceChildren(image);
  }
}

/** Chỉ hiện ngôn ngữ mẹ đẻ có dữ liệu; tiếng Anh dùng nhãn vì chưa có cờ phù hợp. */
function nativeBadge(native) {
  if (native === 'en') {
    return el('span', { className: 'site-header__profile-native', 'aria-label': 'Ngôn ngữ mẹ đẻ: tiếng Anh' }, 'EN');
  }
  const flags = {
    vi: ['flag-vn.svg', 'Ngôn ngữ mẹ đẻ: tiếng Việt'],
    ja: ['flag-jp.svg', 'Ngôn ngữ mẹ đẻ: tiếng Nhật'],
  };
  // Giá trị thiếu hoặc không hợp lệ không được thay bằng một quốc kỳ phỏng đoán.
  if (!flags[native]) {
    return null;
  }
  return el('img', {
    className: 'site-header__profile-flag',
    src: '/assets/icons/' + flags[native][0],
    alt: flags[native][1],
    width: 20,
    height: 14,
  });
}

/** Tạo cùng danh sách liên kết cho thanh desktop và menu di động. */
function navLinks(active) {
  return items.map(([key, label]) => {
    const current = active === key;
    return el('a', {
      href: routes[key],
      className: 'site-header__link' + (current ? ' is-active' : ''),
      'aria-current': current ? 'page' : null,
    },
    el('span', {}, label),
    el('span', { className: 'site-header__underline', 'aria-hidden': 'true' })
    );
  });
}

/**
 * Gắn header dùng chung cho trang xác thực, nội dung và tìm kiếm.
 * @param {HTMLElement} target Vùng data-component="header" trong trang.
 * @param {object} options Biến thể, tab hiện tại, cờ ẩn đăng nhập, searchSlot hoặc searchForm riêng cho Home.
 * @returns {HTMLElement|null} Header đã dựng hoặc null nếu không có vùng gắn.
 */
export function mountHeader(target = qs('[data-component="header"]'), options = {}) {
  if (!target) {
    return null;
  }
  mounts.get(target)?.abort();
  const events = new AbortController();
  mounts.set(target, events);
  const { signal } = events;
  const variant = options.variant ?? target.dataset.variant ?? 'default';
  // Trang thông báo dùng thanh tác vụ riêng trong cùng component, không sao chép header vào HTML.
  if (variant === 'notifications') {
    target.classList.add('site-header', 'site-header--notifications');
    const back = el('button', { type: 'button', className: 'site-header__icon', 'aria-label': 'Quay lại' }, notificationIcon('back'));
    // Chỉ quay lại lịch sử trong ứng dụng; truy cập trực tiếp thì về Trang chủ.
    back.addEventListener('click', () => {
      if (history.length > 1 && document.referrer.startsWith(location.origin + '/')) {
        history.back();
      } else {
        location.assign(routes.home);
      }
    }, { signal });
    const readAll = options.notificationReadAll;
    readAll.textContent = 'Đọc hết';
    readAll.classList.add('site-header__read-all');
    target.replaceChildren(el('div', { className: 'site-header__notification-nav' }, back,
      el('h1', { className: 'site-header__notification-title', id: 'notifications-title' }, 'Thông báo'), readAll));
    return target;
  }
  const searchForm = options.searchForm === true && variant !== 'search';
  // Trang tìm kiếm không có tab đang chọn; các trang khác nhận tab từ options hoặc HTML.
  let active = options.active !== undefined ? options.active : target.dataset.active || null;
  if (variant === 'search') {
    active = null;
  }
  const hideAuthLink = options.hideAuthLink ?? [routes.login, routes.register].includes(location.pathname);
  const menuId = 'header-menu-' + (++headerCount);
  const profileId = 'header-profile-' + headerCount;
  const notificationId = 'header-notifications-' + headerCount;
  const languageId = 'header-language-' + headerCount;
  let notificationMenu = null;
  let bellButton = null;
  let sessionEvents = null;
  let sessionIdentity;
  // Huỷ cả listener của menu hiện tại khi header được dựng lại hoặc rời vòng đời gắn.
  signal.addEventListener('abort', () => sessionEvents?.abort(), { once: true });
  target.classList.add('site-header');
  target.classList.toggle('site-header--search', variant === 'search');
  target.classList.toggle('site-header--home-search', searchForm);

  // Thương hiệu và điều hướng được dựng một lần tại component, không sao chép vào trang.
  const brand = el('a', {
    className: 'site-header__brand',
    href: routes.home,
    'aria-label': 'Etsubi – Trang chủ',
  },
  el('img', { src: '/assets/icons/etsubi-logo.svg', alt: '', width: 36, height: 36 }),
  el('span', { className: 'brand-word' }, 'Etsubi')
  );
  const nav = el('nav', {
    className: 'site-header__nav',
    'aria-label': 'Chính',
  }, navLinks(active));
  const utils = el('div', { className: 'site-header__utils' });
  // Trang Đăng nhập/Đăng ký (hideAuthLink) theo Figma chỉ có huy hiệu ngôn ngữ, không có nút tìm kiếm.
  if (variant !== 'search' && !hideAuthLink) {
    utils.append(el('a', {
      className: 'site-header__icon site-header__search',
      href: routes.search,
      'aria-label': 'Tìm kiếm',
    }, icon('search-white')));
  }

  // Dropdown dùng nguồn tuỳ chọn chung với Cài đặt, mở ra thì các menu khác của header tự đóng.
  const languageMenu = createLanguageMenu({ id: languageId, signal, beforeOpen: () => closeMenus() });

  // Menu dùng id riêng cho mỗi header để aria-controls luôn trỏ đúng vùng.
  const session = el('div', {
    className: 'site-header__session',
    'data-header-session': '',
  });
  const mobileNav = el('nav', {
    id: menuId,
    className: 'site-header__mobile-nav',
    'aria-label': 'Điều hướng di động',
    hidden: true,
  }, navLinks(active));
  const menuButton = el('button', {
    type: 'button',
    className: 'site-header__icon site-header__menu-button',
    'aria-label': 'Mở điều hướng',
    'aria-expanded': 'false',
    'aria-controls': menuId,
  });
  // SVG cố định không chứa dữ liệu người dùng, dùng currentColor để theo màu nút.
  menuButton.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';

  /** Đóng mọi menu; Escape hoặc click ngoài trả focus về nút đã mở bảng. */
  function closeMenus(restoreFocus = false) {
    const profile = qs('[data-profile-menu]', session);
    const languageWasOpen = languageMenu.isOpen();
    languageMenu.close(restoreFocus);
    if (restoreFocus && !languageWasOpen) {
      if (!mobileNav.hidden) {
        menuButton.focus();
      } else if (profile && !profile.hidden) {
        qs('[data-avatar-button]', session)?.focus();
      } else if (notificationMenu && !notificationMenu.element.hidden) {
        bellButton?.focus();
      }
    }
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Mở điều hướng');
    if (profile) {
      profile.hidden = true;
    }
    qs('[data-avatar-button]', session)?.setAttribute('aria-expanded', 'false');
    qs('[data-avatar-button]', session)?.classList.remove('is-open');
    notificationMenu?.close();
    bellButton?.setAttribute('aria-expanded', 'false');
    bellButton?.classList.remove('is-open');
  }

  // Chỉ mở một menu mỗi lần và công bố trạng thái mới cho trình đọc màn hình.
  menuButton.addEventListener('click', () => {
    const open = mobileNav.hidden;
    closeMenus();
    mobileNav.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Đóng điều hướng' : 'Mở điều hướng');
  }, { signal });

  /** Hiện liên kết đăng nhập hoặc chuông và avatar tuỳ hồ sơ của phiên hiện tại. */
  function renderSession(user) {
    const identity = user ? JSON.stringify([user.id, user.displayname, user.username, user.email, user.native, user.avatarUrl]) : null;
    // Cache và GET /my có thể trả cùng hồ sơ; không dựng lại menu hoặc gọi số chưa đọc hai lần.
    if (identity === sessionIdentity) {
      return;
    }
    sessionIdentity = identity;
    closeMenus();
    sessionEvents?.abort();
    notificationMenu?.element.remove();
    notificationMenu = null;
    bellButton = null;
    session.replaceChildren();
    if (!user) {
      // Chưa đăng nhập: nút ngôn ngữ đứng ngay trước liên kết "Đăng nhập".
      utils.insertBefore(languageMenu.element, session);
      if (!hideAuthLink) {
        session.append(el('a', {
          className: 'site-header__login',
          href: withRedirect(routes.login, location.pathname + location.search + location.hash),
        }, 'Đăng nhập'));
      }
      return;
    }
    sessionEvents = new AbortController();
    const sessionSignal = sessionEvents.signal;
    const bell = el('a', {
      href: routes.notifications,
      className: 'site-header__icon site-header__bell',
      'aria-label': 'Thông báo',
      'aria-haspopup': 'true',
      'aria-expanded': 'false',
      'aria-controls': notificationId,
    });
    // bell.svg cũ có chấm đỏ vẽ sẵn; dùng Lucide chuẩn để chấm chỉ xuất hiện theo số thật từ API.
    bell.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    bellButton = bell;
    const dot = el('span', { className: 'site-header__bell-dot', hidden: true, 'aria-hidden': 'true' });
    bell.append(dot);
    let countVersion = 0;
    const notifications = createNotificationMenu({ id: notificationId, signal: sessionSignal, onRead: refreshUnreadCount });
    notificationMenu = notifications;
    target.append(notifications.element);

    /** Lấy số thật khi gắn, trở lại tab hoặc vừa đọc; lỗi mạng ẩn chấm và không tự lặp. */
    async function refreshUnreadCount() {
      const version = ++countVersion;
      let count = 0;
      try {
        const result = await getUnreadCount();
        count = Number.isFinite(result?.count) ? Math.max(0, result.count) : 0;
      } catch {
        // Header vẫn dùng được khi API thông báo lỗi; không ghi lỗi console hoặc tạo bộ hẹn giờ.
      }
      if (sessionSignal.aborted || version !== countVersion) {
        return;
      }
      dot.hidden = count <= 0;
      bell.setAttribute('aria-label', 'Thông báo' + (count > 0 ? ', ' + count + ' chưa đọc' : ''));
      notifications.setUnreadCount(count);
      return count;
    }

    // Chuông đóng bảng đang mở trước khi mở thông báo để các menu không chồng lên nhau.
    bell.addEventListener('click', event => {
      // Điện thoại dùng liên kết thật; tổ hợp mở tab mới trên desktop vẫn hoạt động như liên kết thường.
      if (window.innerWidth <= 600 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      const open = notifications.element.hidden;
      closeMenus();
      if (open) {
        notifications.open();
        bell.setAttribute('aria-expanded', 'true');
        bell.classList.add('is-open');
      }
    }, { signal: sessionSignal });
    /** Trên mobile chuông là link trang, desktop công bố đầy đủ thuộc tính mở panel. */
    function updateBellMode() {
      if (window.innerWidth <= 600) {
        closeMenus();
        bell.removeAttribute('aria-haspopup');
        bell.removeAttribute('aria-expanded');
        bell.removeAttribute('aria-controls');
        bell.removeAttribute('role');
      } else {
        bell.setAttribute('role', 'button');
        bell.setAttribute('aria-haspopup', 'true');
        bell.setAttribute('aria-expanded', String(!notifications.element.hidden));
        bell.setAttribute('aria-controls', notificationId);
      }
    }
    // Role button trên desktop hỗ trợ cả Space; Enter vẫn đi qua click của liên kết.
    bell.addEventListener('keydown', event => {
      if (event.key === ' ' && window.innerWidth > 600) {
        event.preventDefault();
        bell.click();
      }
    }, { signal: sessionSignal });
    window.addEventListener('resize', updateBellMode, { signal: sessionSignal });
    updateBellMode();
    // Chỉ kiểm tra lại khi tab thực sự hiện; không polling hoặc gọi khi khách chưa đăng nhập.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
      }
    }, { signal: sessionSignal });
    void refreshUnreadCount();
    const avatar = el('button', {
      type: 'button',
      className: 'avatar site-header__avatar',
      'data-avatar-button': '',
      'aria-label': 'Tài khoản ' + (getAuthorLabel(user) || '–'),
      'aria-expanded': 'false',
      'aria-controls': profileId,
    });
    fillAvatar(avatar, user, sessionSignal);
    // Đầu panel dùng DOM văn bản an toàn, cờ mẹ đẻ tách khỏi ngôn ngữ giao diện.
    const panelAvatar = el('span', { className: 'avatar site-header__profile-avatar' });
    fillAvatar(panelAvatar, user, sessionSignal);
    const heading = el('div', { className: 'site-header__profile-heading' },
      panelAvatar,
      el('div', { className: 'site-header__profile-details' },
        el('div', { className: 'site-header__profile-name-row' },
          el('span', { className: 'site-header__profile-name' }, getAuthorLabel(user) || '–'),
          nativeBadge(user.native)
        ),
        // Giữ email và thêm handle ở giữa để không nhầm hai loại tên.
        el('p', { className: 'site-header__profile-email' }, getAuthorHandle(user)),
        el('p', { className: 'site-header__profile-email' }, user.email || '–')
      )
    );
    // Đăng xuất là nút thật để khoá thao tác trong lúc API xử lý, các trang dùng liên kết thường.
    const signOut = el('button', {
      type: 'button',
      className: 'site-header__profile-action site-header__profile-action--logout',
    }, profileIcon('logout'), 'Đăng xuất');
    const menu = el('div', {
      id: profileId,
      className: 'site-header__profile-menu',
      'data-profile-menu': '',
      hidden: true,
    },
    heading,
    el('div', { className: 'site-header__profile-links' },
      el('a', { href: routes.profile, className: 'site-header__profile-action' }, profileIcon('user'), 'Hồ sơ của tôi'),
      el('a', { href: routes.settings, className: 'site-header__profile-action' }, profileIcon('settings'), 'Cài đặt')
    ),
    el('div', { className: 'site-header__profile-exit' }, signOut)
    );
    // Menu tài khoản cũng đóng menu điều hướng trước khi mở để không chồng hai bảng.
    avatar.addEventListener('click', () => {
      const open = menu.hidden;
      closeMenus();
      menu.hidden = !open;
      avatar.setAttribute('aria-expanded', String(open));
      avatar.classList.toggle('is-open', open);
    }, { signal: sessionSignal });
    // Hỏi trang đang sửa trước khi xoá phiên; khi ở lại phải bật lại nút và trả focus về menu.
    signOut.addEventListener('click', async () => {
      signOut.disabled = true;
      try {
        if (!(await confirmLeave())) {
          signOut.disabled = false;
          signOut.focus();
          return;
        }
        await logout();
      } finally {
        signOut.disabled = false;
      }
    }, { signal: sessionSignal });
    // Thứ tự đúng Figma Home 4: chuông, huy hiệu ngôn ngữ (VI/JA/EN), rồi avatar.
    session.append(bell, languageMenu.element, avatar, menu);
  }

  // Thứ tự nút và liên kết giữ nguyên theo thiết kế để tab bàn phím đi đúng thứ tự.
  utils.append(languageMenu.element, session, menuButton);
  target.replaceChildren(brand);
  // Form chỉ chuyển trang khi gửi; input chỉ bật tắt nút, không gửi yêu cầu gợi ý.
  if (searchForm) {
    const input = el('input', {
      type: 'search', name: 'q', 'data-search-input': '',
      placeholder: 'Tìm kiếm bài viết, chủ đề...', 'aria-label': 'Tìm kiếm',
      autocomplete: 'off', autocorrect: 'off', spellcheck: 'false',
    });
    const submit = el('button', {
      type: 'submit', className: 'site-header__home-search-submit', disabled: true,
    });
    // Lucide search có khung vuông 24 và nét tròn chuẩn, hiển thị ở 16px theo Figma 292:2401.
    submit.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
    submit.append('Tìm kiếm');
    const form = el('form', {
      className: 'site-header__home-search', role: 'search', action: routes.search,
    }, el('label', { className: 'u-visually-hidden', for: 'home-search-' + headerCount }, 'Tìm kiếm'),
    el('span', { className: 'site-header__home-search-icon', 'aria-hidden': 'true' }), input, submit);
    input.id = 'home-search-' + headerCount;
    /** Chỉ bật nút khi có chữ sau trim; không tải dữ liệu trong lúc đang gõ. */
    function updateSearchSubmit() {
      submit.disabled = !input.value.trim();
    }
    /** Enter và nút dùng cùng URL chuẩn hoá; từ khoá rỗng không chuyển trang. */
    function submitHomeSearch(event) {
      event.preventDefault();
      if (!input.value.trim()) {
        return;
      }
      location.assign(searchUrl({ q: input.value }));
    }
    form.addEventListener('submit', submitHomeSearch, { signal });
    input.addEventListener('input', updateSearchSubmit, { signal });
    target.append(form);
  }
  if (variant === 'search' && options.searchSlot) {
    const slot = el('div', { className: 'site-header__search-slot' }, options.searchSlot);
    target.append(slot);
  }
  target.append(el('div', { className: 'site-header__spacer', 'aria-hidden': 'true' }), nav, utils, mobileNav);
  renderSession(getCachedUser());
  // Header có thể đã dựng lại trong lúc tải; không cập nhật từ yêu cầu của bản cũ.
  void fetchCurrentUser().then(user => {
    if (!signal.aborted) {
      renderSession(user);
    }
  });
  document.addEventListener('click', event => {
    // Dùng đường đi sự kiện ban đầu vì nút Thử lại có thể đã bị thay bằng chữ tải trước khi nổi bọt.
    const path = event.composedPath();
    const outsideNotifications = notificationMenu && !notificationMenu.element.hidden
      && !path.includes(notificationMenu.element) && !path.includes(bellButton);
    const profile = qs('[data-profile-menu]', session);
    const outsideProfile = profile && !profile.hidden
      && !path.includes(profile) && !path.includes(qs('[data-avatar-button]', session));
    const outsideLanguage = languageMenu.isOpen() && !path.includes(languageMenu.element);
    if (!path.includes(target) || outsideNotifications || outsideProfile || outsideLanguage) {
      closeMenus(true);
    }
  }, { signal });

  // Escape đóng menu; phím / tìm kiếm chỉ hoạt động ngoài vùng đang nhập văn bản.
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMenus(true);
    }
    const editable = event.target instanceof Element
      && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
    if (event.key === '/' && !editable && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const input = qs('[data-search-input]');
      if (input && (!searchForm || window.innerWidth > 960)) {
        input.focus();
      } else {
        location.assign(routes.search);
      }
    }
  }, { signal });

  // Khi trở lại desktop, đóng menu di động; màn hẹp ẩn nút ngôn ngữ nên cũng đóng danh sách của nút.
  window.addEventListener('resize', () => {
    if (window.innerWidth > 960) {
      closeMenus();
    } else if (window.innerWidth <= 600) {
      languageMenu.close();
    }
  }, { signal });
  return target;
}
