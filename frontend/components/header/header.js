/** Thanh điều hướng dùng chung cho mọi trang; quản lý menu, phiên và phím tắt tìm kiếm. */
import { el, qs } from '/utils/dom.js';
import { routes, withRedirect } from '/utils/routes.js';
import { getCachedUser, fetchCurrentUser, logout } from '/utils/auth.js';
import { readStorage, writeStorage } from '/services/api/client.js';
import { initials } from '/utils/format.js';

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
 * @param {object} options Biến thể, tab hiện tại, cờ ẩn đăng nhập và vùng ô tìm kiếm.
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
  // Trang tìm kiếm không có tab đang chọn; các trang khác nhận tab từ options hoặc HTML.
  let active = options.active !== undefined ? options.active : target.dataset.active || null;
  if (variant === 'search') {
    active = null;
  }
  const hideAuthLink = options.hideAuthLink ?? [routes.login, routes.register].includes(location.pathname);
  const menuId = 'header-menu-' + (++headerCount);
  const profileId = 'header-profile-' + headerCount;
  target.classList.add('site-header');
  target.classList.toggle('site-header--search', variant === 'search');

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
  if (variant !== 'search') {
    utils.append(el('a', {
      className: 'site-header__icon site-header__search',
      href: routes.search,
      'aria-label': 'Tìm kiếm',
    }, icon('search-white')));
  }

  // Lưu lựa chọn ngôn ngữ để trang đăng ký gửi cùng hồ sơ mới.
  const languages = ['vi', 'ja', 'en'];
  let language = readStorage('etsubi_lang') || 'vi';
  if (!languages.includes(language)) {
    language = 'vi';
  }
  const languageButton = el('button', {
    type: 'button',
    className: 'site-header__language',
    'aria-label': 'Đổi ngôn ngữ',
  }, language.toUpperCase());
  languageButton.addEventListener('click', () => {
    language = languages[(languages.indexOf(language) + 1) % languages.length];
    writeStorage('etsubi_lang', language);
    languageButton.textContent = language.toUpperCase();
    // Chỉ lưu lựa chọn; bản dịch giao diện sẽ được nối khi có từ điển i18n.
  }, { signal });

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

  /** Đóng cả menu điều hướng lẫn tài khoản; Escape trả focus về nút đã mở menu. */
  function closeMenus(restoreFocus = false) {
    const profile = qs('[data-profile-menu]', session);
    if (restoreFocus) {
      if (!mobileNav.hidden) {
        menuButton.focus();
      } else if (profile && !profile.hidden) {
        qs('[data-avatar-button]', session)?.focus();
      }
    }
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Mở điều hướng');
    if (profile) {
      profile.hidden = true;
    }
    qs('[data-avatar-button]', session)?.setAttribute('aria-expanded', 'false');
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
    session.replaceChildren();
    if (!user) {
      if (!hideAuthLink) {
        session.append(el('a', {
          className: 'site-header__login',
          href: withRedirect(routes.login, location.pathname + location.search + location.hash),
        }, 'Đăng nhập'));
      }
      return;
    }
    const bell = el('button', {
      type: 'button',
      className: 'site-header__icon site-header__bell',
      'aria-label': 'Thông báo',
    }, icon('bell'));
    const avatar = el('button', {
      type: 'button',
      className: 'avatar site-header__avatar',
      'data-avatar-button': '',
      'aria-label': 'Tài khoản ' + user.username,
      'aria-expanded': 'false',
      'aria-controls': profileId,
    }, initials(user.username));
    // Nếu ảnh lỗi, thay bằng chữ viết tắt để nút tài khoản vẫn nhận diện được.
    if (user.avatarUrl) {
      const image = el('img', { src: user.avatarUrl, alt: user.username });
      image.addEventListener('error', () => {
        avatar.replaceChildren(initials(user.username));
      }, { once: true, signal });
      avatar.replaceChildren(image);
    }
    const signOut = el('button', {
      type: 'button',
      className: 'site-header__profile-action',
    }, 'Đăng xuất');
    const menu = el('div', {
      id: profileId,
      className: 'site-header__profile-menu',
      'data-profile-menu': '',
      hidden: true,
    },
    el('a', { href: routes.profile, className: 'site-header__profile-action' }, 'Hồ sơ'),
    signOut
    );
    // Menu tài khoản cũng đóng menu điều hướng trước khi mở để không chồng hai bảng.
    avatar.addEventListener('click', () => {
      const open = menu.hidden;
      closeMenus();
      menu.hidden = !open;
      avatar.setAttribute('aria-expanded', String(open));
    }, { signal });
    signOut.addEventListener('click', () => {
      signOut.disabled = true;
      void logout();
    }, { signal });
    session.append(bell, avatar, menu);
  }

  // Thứ tự nút và liên kết giữ nguyên theo thiết kế để tab bàn phím đi đúng thứ tự.
  utils.append(languageButton, session, menuButton);
  target.replaceChildren(brand);
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
    if (!target.contains(event.target)) {
      closeMenus();
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
      if (input) {
        input.focus();
      } else {
        location.assign(routes.search);
      }
    }
  }, { signal });

  // Khi trở lại desktop, đóng menu di động để không giữ bảng nổi không còn cần thiết.
  window.addEventListener('resize', () => {
    if (window.innerWidth > 960) {
      closeMenus();
    }
  }, { signal });
  return target;
}
