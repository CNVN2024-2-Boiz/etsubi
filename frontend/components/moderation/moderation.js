/**
 * Thành phần dùng chung cho góc nhìn Điều hành viên / Quản trị viên (Figma 1:2435):
 * nhãn trạng thái, nhãn "Chỉ Mod/Admin thấy", khối viền đứt, menu thả xuống và hộp thoại xác nhận.
 * Trang Hồ sơ và trang Đọc bài dùng chung module này.
 */
import { getAuthorLabel, getAuthorHandle } from '/services/api/posts.js';
import { el } from '/utils/dom.js';
import { toVietnameseMessage } from '/utils/errors.js';

// Biểu tượng Lucide (24 viewBox, nét 2px, theo màu chữ); chuỗi cố định, không chứa dữ liệu người dùng.
const ICONS = {
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  mute: '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  userCog: '<circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/><path d="m16.6 18.7.3-.9"/><path d="m19.1 12.2.3-.9"/><path d="m19.6 18.7-.4-1"/><path d="m16.8 12.3-.4-1"/><path d="m14.3 16.6 1-.4"/><path d="m20.7 13.8 1-.4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  restore: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
};

/**
 * Tạo biểu tượng SVG theo tên trong bảng ICONS.
 * @param {string} name Tên biểu tượng.
 * @param {number} size Kích thước px.
 * @returns {SVGElement} Biểu tượng ẩn với trình đọc màn hình.
 */
export function modIcon(name, size = 16) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) {
    svg.setAttribute(key, value);
  }
  svg.innerHTML = ICONS[name];
  return svg;
}

/* ===== Quyền ===== */

// Thứ bậc vai trò: admin > moderator > user.
const ROLE_RANK = { user: 0, moderator: 1, admin: 2 };
export const ROLE_LABELS = { user: 'Thành viên', moderator: 'Điều hành viên', admin: 'Quản trị viên' };

/** Người xem có phải staff (Điều hành viên hoặc Quản trị viên) không. */
export function isStaff(viewer) {
  return Boolean(viewer && (viewer.role === 'moderator' || viewer.role === 'admin'));
}

/**
 * Người xem có được tắt tiếng / cấm / đổi vai trò người này không: phải là staff, không phải chính mình
 * và chỉ tác động người có vai trò thấp hơn mình (giống kiểm tra của backend).
 */
export function canModerateUser(viewer, target) {
  if (!isStaff(viewer) || !target || viewer.id === target.id) {
    return false;
  }
  return (ROLE_RANK[viewer.role] ?? 0) > (ROLE_RANK[target.role] ?? 0);
}

/* ===== Định dạng thời gian ===== */

const pad = number => String(number).padStart(2, '0');

/** "18:00 · 15/11" (thêm năm khi khác năm hiện tại). */
export function formatUntil(value) {
  const date = new Date(value);
  const year = date.getFullYear() === new Date().getFullYear() ? '' : '/' + date.getFullYear();
  return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ' · ' + pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + year;
}

/** "18:00 · 15/11/2026" luôn có năm, dùng trong câu giải thích. */
export function formatUntilFull(value) {
  const date = new Date(value);
  return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ' · ' + pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear();
}

/** "Còn 6 giờ 12 phút" / "Còn 3 ngày 2 giờ" tính từ bây giờ. */
export function formatRemaining(value) {
  const minutes = Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days) {
    return 'Còn ' + days + ' ngày' + (hours ? ' ' + hours + ' giờ' : '');
  }
  return 'Còn ' + (hours ? hours + ' giờ ' : '') + (minutes % 60) + ' phút';
}

/** Người dùng đang bị tắt tiếng (muted_until còn trong tương lai). */
export function isMutedNow(mutedUntil) {
  return Boolean(mutedUntil && new Date(mutedUntil).getTime() > Date.now());
}

/* ===== Nhãn và khối ===== */

/** Nhãn đen "Chỉ Mod/Admin thấy" với icon khiên. */
export function createStaffTag() {
  return el('span', { className: 'staff-tag' }, modIcon('shield', 12), 'Chỉ Mod/Admin thấy');
}

// Icon và chữ mặc định của từng loại nhãn trạng thái.
const BADGES = {
  muted: ['mute', 'Đang bị tắt tiếng'],
  banned: ['ban', 'Đã bị cấm'],
  hidden: ['eyeOff', 'Đã ẩn'],
  deleted: ['trash', 'Đã xoá'],
  locked: ['lock', 'Đã khoá bình luận'],
};

/**
 * Nhãn trạng thái (StatusBadge): muted, banned, hidden, deleted, locked.
 * @param {string} kind Loại nhãn.
 * @param {string} text Chữ thay cho chữ mặc định (ví dụ "Tắt tiếng đến 18:00 · 15/11").
 */
export function createStatusBadge(kind, text) {
  const [iconName, label] = BADGES[kind];
  return el('span', { className: 'status-badge status-badge--' + kind }, modIcon(iconName, 14), text || label);
}

/** Khối viền đứt màu slate chứa nội dung chỉ staff thấy. */
export function createStaffBox(...children) {
  return el('div', { className: 'staff-box' }, ...children);
}

/**
 * Nút viền slate dùng trong khối staff (Gỡ tắt tiếng, Gỡ cấm, Hiện lại, Khôi phục...).
 * @param {string} iconName Tên icon.
 * @param {string} label Nhãn nút.
 * @param {Function} onClick Hàm xử lý khi bấm.
 * @param {boolean} plain true để dùng viền nhạt (nút phụ như "Gia hạn…").
 */
export function createStaffButton(iconName, label, onClick, plain = false) {
  const button = el('button', { type: 'button', className: 'staff-button' + (plain ? ' staff-button--plain' : '') }, modIcon(iconName, 16), label);
  button.addEventListener('click', onClick);
  return button;
}

/* ===== Menu thả xuống ===== */

let openMenu = null;
let menuCount = 0;

/** Đóng menu đang mở (nếu có); trả focus về nút mở khi cần. */
function closeOpenMenu(restoreFocus = false) {
  if (!openMenu) {
    return;
  }
  const { panel, trigger } = openMenu;
  panel.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  openMenu = null;
  if (restoreFocus) {
    trigger.focus();
  }
}

/** Bấm ra ngoài hoặc nhấn Escape thì đóng menu. */
function handleDocument(event) {
  if (!openMenu) {
    return;
  }
  if (event.type === 'keydown' && event.key === 'Escape') {
    closeOpenMenu(true);
  } else if (event.type === 'click' && !openMenu.wrapper.contains(event.target)) {
    closeOpenMenu();
  }
}
document.addEventListener('click', handleDocument);
document.addEventListener('keydown', handleDocument);

/**
 * Tạo menu thả xuống gắn với một nút mở.
 * @param {HTMLElement} trigger Nút mở menu (đã có nhãn và kiểu riêng).
 * @param {object} options header: { icon, text } dòng tiêu đề; items: mảng mục hoặc 'divider'.
 *   Mỗi mục: { icon, label, sub, danger, disabled, onSelect }.
 * @returns {HTMLElement} Khối bọc chứa nút và menu.
 */
export function createMenu(trigger, { header, items }) {
  const id = 'mod-menu-' + (++menuCount);
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', id);
  const panel = el('div', { id, className: 'mod-menu', role: 'menu', hidden: true });
  if (header) {
    panel.append(el('p', { className: 'mod-menu__header' }, header.icon ? modIcon(header.icon, 14) : null, header.text));
  }
  for (const item of items) {
    if (item === 'divider') {
      panel.append(el('hr', { className: 'mod-menu__divider' }));
      continue;
    }
    const button = el('button', {
      type: 'button',
      role: 'menuitem',
      className: 'mod-menu__item' + (item.danger ? ' mod-menu__item--danger' : ''),
      disabled: item.disabled,
    },
    modIcon(item.icon, 18),
    el('span', { className: 'mod-menu__text' }, el('span', {}, item.label), item.sub ? el('span', { className: 'mod-menu__sub' }, item.sub) : null),
    item.disabled ? modIcon('lock', 14) : null);
    // Chọn một mục: đóng menu trước rồi mới chạy thao tác (thường là mở hộp thoại xác nhận).
    button.addEventListener('click', () => {
      closeOpenMenu();
      item.onSelect?.();
    });
    panel.append(button);
  }
  const wrapper = el('div', { className: 'mod-menu-wrap' }, trigger, panel);

  /** Bấm nút mở: đóng menu khác rồi mở menu này và đưa focus vào mục đầu tiên dùng được. */
  function toggle(event) {
    event.stopPropagation();
    const shouldOpen = panel.hidden;
    closeOpenMenu();
    if (shouldOpen) {
      panel.hidden = false;
      // Menu neo mép phải nút mở; trên điện thoại nút ⋯ của bình luận nằm giữa dòng
      // nên menu 272px có thể tràn mép trái. Đo rồi dịch ngang đúng phần tràn, chừa 8px.
      panel.style.setProperty('--mod-menu-shift', '0px');
      const rect = panel.getBoundingClientRect();
      const edge = 8;
      let shift = 0;
      if (rect.left < edge) {
        shift = edge - rect.left;
      } else if (rect.right > window.innerWidth - edge) {
        shift = window.innerWidth - edge - rect.right;
      }
      panel.style.setProperty('--mod-menu-shift', shift + 'px');
      trigger.setAttribute('aria-expanded', 'true');
      openMenu = { panel, trigger, wrapper };
      panel.querySelector('.mod-menu__item:not(:disabled)')?.focus();
    }
  }

  /** Mũi tên lên/xuống di chuyển giữa các mục dùng được. */
  function moveFocus(event) {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const enabled = [...panel.querySelectorAll('.mod-menu__item:not(:disabled)')];
    const index = enabled.indexOf(document.activeElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % enabled.length : (index - 1 + enabled.length) % enabled.length;
    enabled[next]?.focus();
  }

  trigger.addEventListener('click', toggle);
  panel.addEventListener('keydown', moveFocus);
  return wrapper;
}

/** Nút "···" tròn dùng mở menu kiểm duyệt trên bài viết hoặc bình luận. */
export function createMoreButton(label) {
  return el('button', { type: 'button', className: 'mod-more', 'aria-label': label }, modIcon('more', 18));
}

/* ===== Hộp thoại xác nhận ===== */

/**
 * Mở hộp thoại xác nhận (thẻ dialog có sẵn của trình duyệt, không animation).
 * @param {object} options icon, tone ('red'|'amber'), title, subtitle, body (mảng Node),
 *   confirmLabel, confirmIcon, isReady() (bật nút xác nhận), onConfirm() (async, ném lỗi để giữ hộp thoại mở).
 * @returns {Promise<boolean>} true nếu đã xác nhận và thao tác thành công.
 */
export function openConfirmDialog({ icon, tone = 'red', title, subtitle, body = [], confirmLabel, confirmIcon, isReady = () => true, onConfirm }) {
  return new Promise(resolve => {
    const error = el('p', { className: 'mod-dialog__error', role: 'alert', hidden: true });
    const confirm = el('button', { type: 'submit', className: 'mod-dialog__confirm' }, confirmIcon ? modIcon(confirmIcon, 16) : null, el('span', {}, confirmLabel));
    const cancel = el('button', { type: 'button', className: 'mod-dialog__cancel' }, 'Huỷ');
    const close = el('button', { type: 'button', className: 'mod-dialog__close', 'aria-label': 'Đóng' }, modIcon('x', 20));
    const titleId = 'mod-dialog-title-' + (++menuCount);
    const form = el('form', { className: 'mod-dialog__panel', method: 'dialog', novalidate: true },
      el('div', { className: 'mod-dialog__head' },
        el('span', { className: 'mod-dialog__icon mod-dialog__icon--' + tone }, modIcon(icon, 22)),
        el('div', { className: 'mod-dialog__titles' },
          el('h2', { id: titleId, className: 'mod-dialog__title' }, title),
          subtitle ? el('p', { className: 'mod-dialog__subtitle' }, subtitle) : null),
        close),
      ...body, error,
      el('div', { className: 'mod-dialog__footer' }, cancel, confirm));
    const dialog = el('dialog', { className: 'mod-dialog', 'aria-labelledby': titleId }, form);
    let done = false;

    /** Bật/tắt nút xác nhận theo điều kiện của từng hộp thoại (ví dụ đã gõ đúng tên). */
    function sync() {
      confirm.disabled = !isReady();
    }

    /** Đóng hộp thoại, gỡ khỏi trang và trả kết quả. */
    function finish(result) {
      if (done) {
        return;
      }
      done = true;
      dialog.close();
      dialog.remove();
      resolve(result);
    }

    /** Bấm xác nhận: chạy thao tác; lỗi thì hiện ngay trong hộp thoại để người dùng thử lại. */
    async function submit(event) {
      event.preventDefault();
      if (confirm.disabled) {
        return;
      }
      confirm.disabled = true;
      confirm.classList.add('is-loading');
      error.hidden = true;
      try {
        await onConfirm();
        finish(true);
      } catch (problem) {
        error.textContent = toVietnameseMessage(problem);
        error.hidden = false;
        confirm.classList.remove('is-loading');
        sync();
      }
    }

    form.addEventListener('input', sync);
    form.addEventListener('change', sync);
    form.addEventListener('click', sync);
    form.addEventListener('submit', submit);
    cancel.addEventListener('click', () => finish(false));
    close.addEventListener('click', () => finish(false));
    // Escape (sự kiện cancel của dialog) cũng là huỷ.
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      finish(false);
    });
    document.body.append(dialog);
    sync();
    dialog.showModal();
    // Đưa focus vào ô cần thao tác (data-autofocus) hoặc nút Huỷ, thay vì nút × đầu tiên; thao tác nặng không bị xác nhận nhầm bằng Enter.
    (form.querySelector('[data-autofocus]') || cancel).focus();
  });
}

/**
 * Hộp thoại tắt tiếng / gia hạn: chọn nhanh 1 giờ, 24 giờ, 7 ngày, 30 ngày hoặc tuỳ chỉnh.
 * @param {object} user Người bị tắt tiếng (username, role).
 * @param {Function} onConfirm Nhận Date hết hạn, gọi API.
 * @param {boolean} extend true nếu đang gia hạn (đổi tiêu đề).
 */
export function openMuteDialog(user, onConfirm, extend = false) {
  const options = [['1 giờ', 1], ['24 giờ', 24], ['7 ngày', 24 * 7], ['30 ngày', 24 * 30]];
  let hours = 24;
  let custom = null;
  const until = el('p', { className: 'mod-dialog__until' }, modIcon('clock', 16), el('span', {}));
  const customInput = el('input', { type: 'datetime-local', className: 'input mod-dialog__custom', 'aria-label': 'Thời điểm hết hạn tuỳ chỉnh', hidden: true });
  const chips = el('div', { className: 'mod-dialog__chips', role: 'radiogroup', 'aria-label': 'Thời hạn' });
  const confirmLabel = () => (custom ? 'Tắt tiếng đến mốc đã chọn' : 'Tắt tiếng ' + options.find(([, value]) => value === hours)?.[0]);

  /** Thời điểm hết hạn đang chọn. */
  function target() {
    return custom ? new Date(custom) : new Date(Date.now() + hours * 3600000);
  }

  /** Vẽ lại chip đang chọn, dòng "Hết hạn lúc…" và nhãn nút xác nhận. */
  function render() {
    for (const chip of chips.children) {
      const selected = chip.dataset.value === (custom !== null ? 'custom' : String(hours));
      chip.classList.toggle('is-selected', selected);
      chip.setAttribute('aria-checked', String(selected));
    }
    customInput.hidden = custom === null;
    const date = target();
    until.lastChild.textContent = Number.isNaN(date.getTime()) ? 'Chọn thời điểm hết hạn' : 'Hết hạn lúc ' + formatUntilFull(date);
    const label = document.querySelector('.mod-dialog .mod-dialog__confirm span');
    if (label) {
      label.textContent = confirmLabel();
    }
  }

  for (const [label, value] of [...options, ['Tuỳ chỉnh…', 'custom']]) {
    const chip = el('button', { type: 'button', role: 'radio', className: 'mod-dialog__chip', 'data-value': String(value), 'data-autofocus': value === 24 ? '' : null }, label);
    // Bấm chip: chọn thời hạn có sẵn, hoặc mở ô chọn ngày giờ tuỳ chỉnh.
    chip.addEventListener('click', () => {
      if (value === 'custom') {
        custom = customInput.value || '';
      } else {
        custom = null;
        hours = value;
      }
      render();
    });
    chips.append(chip);
  }
  customInput.addEventListener('input', () => {
    custom = customInput.value;
    render();
  });

  const promise = openConfirmDialog({
    icon: 'mute',
    tone: 'amber',
    title: (extend ? 'Gia hạn tắt tiếng ' : 'Tắt tiếng ') + getAuthorLabel(user),
    subtitle: (ROLE_LABELS[user.role] || 'Thành viên') + ' · ' + getAuthorHandle(user),
    body: [
      el('p', { className: 'mod-dialog__text' }, 'Thành viên vẫn đọc được nội dung nhưng không thể đăng bài, bình luận hay thả cảm xúc cho đến khi hết hạn.'),
      el('p', { className: 'mod-dialog__label' }, 'Thời hạn'),
      chips, customInput, until,
    ],
    confirmLabel: confirmLabel(),
    confirmIcon: 'mute',
    isReady: () => target().getTime() > Date.now(),
    onConfirm: () => onConfirm(target()),
  });
  render();
  return promise;
}

/**
 * Hộp thoại cấm tài khoản: liệt kê hậu quả và yêu cầu gõ lại tên người dùng để tránh bấm nhầm.
 * @param {object} user Người bị cấm.
 * @param {Function} onConfirm Gọi API cấm.
 */
export function openBanDialog(user, onConfirm) {
  const input = el('input', { type: 'text', className: 'input mod-dialog__input', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Nhập tên người dùng để xác nhận', 'data-autofocus': '' });
  const consequences = [
    'Không truy cập được các chức năng cần đăng nhập.',
    'Mọi thao tác đăng bài, bình luận, theo dõi đều bị chặn.',
    'Hồ sơ hiển thị nhãn “Đã bị cấm”. Có thể gỡ cấm bất cứ lúc nào.',
  ];
  return openConfirmDialog({
    icon: 'ban',
    title: 'Cấm tài khoản ' + getAuthorLabel(user) + '?',
    subtitle: (ROLE_LABELS[user.role] || 'Thành viên') + ' · ' + getAuthorHandle(user),
    body: [
      el('ul', { className: 'mod-dialog__list' }, consequences.map(text => el('li', {}, modIcon('alert', 16), el('span', {}, text)))),
      el('label', { className: 'mod-dialog__label' }, 'Nhập “' + user.username + '” để xác nhận', input),
    ],
    confirmLabel: 'Cấm tài khoản',
    confirmIcon: 'ban',
    isReady: () => input.value.trim() === user.username,
    onConfirm,
  });
}

/**
 * Hộp thoại đổi vai trò (chỉ Admin): Thành viên / Điều hành viên; Quản trị viên luôn bị khoá.
 * @param {object} user Người được đổi vai trò.
 * @param {Function} onConfirm Nhận vai trò mới ('user' | 'moderator').
 */
export function openRoleDialog(user, onConfirm) {
  const choices = [
    ['user', 'Thành viên', 'Đọc, đăng bài, bình luận và theo dõi.'],
    ['moderator', 'Điều hành viên', 'Ẩn / xoá / khôi phục nội dung, tắt tiếng và cấm thành viên.'],
    ['admin', 'Quản trị viên', 'Không thể gán vai trò này.'],
  ];
  const fieldset = el('fieldset', { className: 'mod-dialog__roles' }, el('legend', { className: 'u-visually-hidden' }, 'Vai trò mới'),
    choices.map(([value, label, desc]) => el('label', { className: 'radio-card' + (value === 'admin' ? ' is-disabled' : '') },
      el('input', { type: 'radio', name: 'role', value, className: 'radio-card__input', checked: user.role === value, disabled: value === 'admin', 'data-autofocus': user.role === value ? '' : null }),
      el('span', { className: 'radio-card__circle', 'aria-hidden': 'true' }),
      el('span', { className: 'radio-card__text' }, el('span', { className: 'radio-card__title' }, label), el('span', { className: 'radio-card__desc' }, desc)))));
  const selected = () => fieldset.querySelector('input:checked')?.value;
  return openConfirmDialog({
    icon: 'userCog',
    title: 'Đổi vai trò ' + getAuthorLabel(user),
    subtitle: 'Hiện tại: ' + (ROLE_LABELS[user.role] || 'Thành viên'),
    body: [fieldset],
    confirmLabel: 'Lưu thay đổi',
    confirmIcon: 'check',
    isReady: () => Boolean(selected()) && selected() !== user.role,
    onConfirm: () => onConfirm(selected()),
  });
}
