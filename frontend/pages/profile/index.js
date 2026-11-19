/**
 * Trang Hồ sơ (Figma 1:3896). Không có ?id thì là hồ sơ của mình (cần đăng nhập),
 * có ?id thì là hồ sơ người khác; ?tab=followers|following chọn danh sách.
 */
import { getAuthorLabel, getAuthorHandle } from '/services/api/posts.js';
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { getUser } from '/services/api/users.js';
import { followUser, unfollowUser, listFollowers, listFollowing, listMyFollowers, listMyFollowing } from '/services/api/follows.js';
import { fetchCurrentUser, requireAuth } from '/utils/auth.js';
import { el, qs, qsa } from '/utils/dom.js';
import { initials } from '/utils/format.js';
import { highlight, wrapJapanese } from '/utils/text.js';
import { toVietnameseMessage } from '/utils/errors.js';
import { routes } from '/utils/routes.js';
import { setUserMute, setUserStatus, setUserRole } from '/services/api/manage.js';
import {
  isStaff, canModerateUser, isMutedNow, formatUntil, formatUntilFull, formatRemaining, ROLE_LABELS as MOD_ROLE_LABELS,
  createStaffTag, createStatusBadge, createStaffBox, createStaffButton, createMenu, modIcon,
  openConfirmDialog, openMuteDialog, openBanDialog, openRoleDialog,
} from '/components/moderation/moderation.js';
import { t } from '/utils/i18n.js';

// Header theo frame Figma (tab Trang chủ đang chọn, ô tìm kiếm trong suốt); footer đầy đủ.
mountHeader(qs('[data-component="header"]'), { active: 'home', searchForm: true });
mountFooter();

// Tên hiển thị của vai trò và tiếng mẹ đẻ.
const ROLE_LABELS = { moderator: t('Điều hành viên'), admin: t('Quản trị viên') };
// Tên ngôn ngữ tự gọi nên không dịch.
const NATIVE_LABELS = { vi: 'Tiếng Việt', ja: '日本語', en: 'English' }; // i18n-ignore

// Biểu tượng Lucide 14px cho hàng thông tin phụ và 14px cho nút theo dõi (chuỗi cố định).
const ICONS = {
  graduation: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
};

const params = new URLSearchParams(location.search);
const state = {
  viewer: null,
  profile: null,
  isOwn: false,
  tab: params.get('tab') === 'following' ? 'following' : 'followers',
  lists: { followers: null, following: null },
  viewerFollowing: new Set(),
  viewerFollowers: new Set(),
  filter: '',
};

/* ===== Tiện ích ===== */

/** Tạo biểu tượng SVG từ bảng ICONS (chuỗi cố định, không chứa dữ liệu người dùng). */
function icon(name, size) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) {
    svg.setAttribute(key, value);
  }
  svg.innerHTML = ICONS[name];
  return svg;
}

/** Điền avatar: ảnh thật nếu có (lỗi ảnh thì quay về chữ đầu tên), không thì chữ đầu tên. */
function fillAvatar(node, user) {
  node.replaceChildren(initials(user.displayname || user.username));
  if (user.avatar_url) {
    const image = el('img', { src: user.avatar_url, alt: '', loading: 'lazy' });
    /** Ảnh hỏng thì hiện lại chữ đầu tên. */
    function useInitials() {
      node.replaceChildren(initials(user.displayname || user.username));
    }
    image.addEventListener('error', useInitials, { once: true });
    node.replaceChildren(image);
  }
  return node;
}

/** Đường dẫn hồ sơ của một người; hồ sơ của chính mình dùng đường dẫn không có id. */
function profileUrl(user, tab) {
  const url = new URL(routes.profile, location.origin);
  if (!state.viewer || user.id !== state.viewer.id) {
    url.searchParams.set('id', user.id);
  }
  if (tab) {
    url.searchParams.set('tab', tab);
  }
  return url.pathname + url.search;
}

/** Báo lỗi chung của trang. */
function showError(message) {
  const box = qs('[data-profile-error]');
  box.textContent = message;
  box.hidden = false;
}

/** Sáu cánh hoa trong dải đỏ của thẻ hồ sơ (file SVG có sẵn kích thước đúng). */
function mountPetals() {
  [1, 2, 3, 4, 5, 6].forEach((file, index) => qs('[data-cover]').append(el('img', {
    className: 'profile-petal profile-petal--' + (index + 1), src: '/assets/illustrations/sakura-' + file + '.svg', alt: '',
  })));
}

/* ===== Nút theo dõi ===== */

/** Trạng thái nút với một người: "following" (đã theo dõi), "back" (họ theo dõi mình), "none". */
function relationTo(userId) {
  if (state.viewerFollowing.has(userId)) {
    return 'following';
  }
  return state.viewerFollowers.has(userId) ? 'back' : 'none';
}

/** Dựng nút Theo dõi / Theo dõi lại / Đang theo dõi (hover đổi thành "Bỏ theo dõi"). */
function createFollowButton(user, size = 'sm', fresh = false) {
  const relation = relationTo(user.id);
  const following = relation === 'following';
  const button = el('button', {
    type: 'button',
    className: 'follow-btn' + (size === 'md' ? ' follow-btn--md' : '') + (following ? ' is-following' : '') + (fresh ? ' is-fresh' : ''),
    'aria-pressed': String(following),
    'aria-label': following ? t('Bỏ theo dõi {name}', { name: getAuthorLabel(user) })
      : relation === 'back' ? t('Theo dõi lại {name}', { name: getAuthorLabel(user) }) : t('Theo dõi {name}', { name: getAuthorLabel(user) }),
  },
  icon(following ? 'check' : 'plus', 14),
  el('span', { className: 'follow-btn__label' }, following ? t('Đang theo dõi') : relation === 'back' ? t('Theo dõi lại') : t('Theo dõi')),
  el('span', { className: 'follow-btn__unfollow' }, t('Bỏ theo dõi')));
  // Vừa bấm theo dõi thì không đổi ngay thành "Bỏ theo dõi"; chỉ đổi sau khi chuột rời nút (theo mô tả Figma).
  button.addEventListener('mouseleave', () => button.classList.remove('is-fresh'));
  // Bấm nút: gửi theo dõi hoặc bỏ theo dõi cho đúng người của dòng này.
  button.addEventListener('click', () => toggleFollow(user, button, size));
  return button;
}

/** Bấm nút theo dõi: gọi API, cập nhật tập "đang theo dõi", số đếm và vẽ lại nút. */
async function toggleFollow(user, button, size) {
  if (!await requireAuth()) {
    return;
  }
  const wasFollowing = state.viewerFollowing.has(user.id);
  button.disabled = true;
  try {
    if (wasFollowing) {
      await unfollowUser(user.id);
      state.viewerFollowing.delete(user.id);
    } else {
      await followUser(user.id);
      state.viewerFollowing.add(user.id);
    }
    // Hồ sơ của mình: số "đang theo dõi" của mình đổi theo; hồ sơ người khác: số người theo dõi họ đổi khi bấm nút ở đầu thẻ.
    if (state.isOwn) {
      await reloadList('following');
    } else if (user.id === state.profile.id) {
      await reloadList('followers');
    }
    const replacement = createFollowButton(user, size, !wasFollowing);
    button.replaceWith(replacement);
    replacement.focus();
    renderCounts();
  } catch (error) {
    button.disabled = false;
    showError(toVietnameseMessage(error));
  }
}

/* ===== Thẻ hồ sơ ===== */

/** Điền tên, vai trò, giới thiệu, thông tin phụ và nút theo dõi (chỉ với hồ sơ người khác). */
function renderProfile() {
  const { profile, isOwn } = state;
  document.title = getAuthorLabel(profile) + ' · Etsubi';
  qs('[data-profile-card]').setAttribute('aria-busy', 'false');
  const avatar = qs('[data-profile-avatar]');
  avatar.classList.remove('profile-card__avatar--placeholder');
  fillAvatar(avatar, profile);
  qs('[data-profile-name]').replaceChildren(wrapJapanese(getAuthorLabel(profile)));
  qs('[data-profile-handle]').textContent = getAuthorHandle(profile);
  const role = qs('[data-profile-role]');
  role.hidden = !ROLE_LABELS[profile.role];
  role.textContent = ROLE_LABELS[profile.role] || '';
  const bio = qs('[data-profile-bio]');
  bio.classList.toggle('profile-card__bio--empty', !profile.bio);
  bio.replaceChildren(profile.bio ? wrapJapanese(profile.bio) : t('Chưa có giới thiệu'));
  // Chỉ hiện những thông tin người dùng đã điền, không đoán thay.
  const meta = [
    profile.institute && ['graduation', profile.institute],
    profile.address && ['pin', profile.address],
    NATIVE_LABELS[profile.native] && ['globe', t('Tiếng mẹ đẻ: {language}', { language: NATIVE_LABELS[profile.native] })],
  ].filter(Boolean);
  qs('[data-profile-meta]').replaceChildren(...meta.map(([name, text]) => el('li', {}, icon(name, 14), el('span', {}, wrapJapanese(text)))));
  qs('[data-camera]').hidden = !isOwn;
  qs('[data-camera]').href = routes.settings;
  renderModeration();
}

/* ===== Góc nhìn Mod/Admin (Figma 1:2435, khu "Hồ sơ người dùng") ===== */

/**
 * Nhãn trạng thái, khối chỉ staff thấy và hàng nút (Theo dõi + Quản trị) theo vai trò người xem:
 * - Ai cũng thấy hồ sơ bị cấm (xám, nhãn "Đã bị cấm", không có nút Theo dõi).
 * - Nhãn tắt tiếng chỉ staff và chính người đó thấy; khối chi tiết và nút thao tác chỉ staff thấy.
 */
function renderModeration() {
  const { profile, viewer, isOwn } = state;
  const banned = profile.status === 'banned';
  const muted = isMutedNow(profile.muted_until);
  const staff = isStaff(viewer);
  const canAct = canModerateUser(viewer, profile);
  qs('[data-profile-card]').classList.toggle('is-banned', banned);

  // Nhãn trạng thái cạnh tên.
  const status = qs('[data-profile-status]');
  status.replaceChildren();
  if (banned) {
    status.append(createStatusBadge('banned'));
  } else if (muted && (staff || isOwn)) {
    status.append(createStatusBadge('muted', t('Tắt tiếng đến {date}', { date: formatUntil(profile.muted_until) })));
  }

  // Khối chỉ staff thấy, có nút gỡ / gia hạn khi người xem được tác động người này.
  const box = qs('[data-staff-slot]');
  box.replaceChildren();
  if (staff && banned) {
    box.append(createStaffBox(
      el('div', { className: 'staff-box__top' }, createStaffTag()),
      el('p', {}, t('Không đăng nhập vào khu vực cần tài khoản được; mọi thao tác ghi đều bị chặn.')),
      canAct ? el('div', { className: 'staff-box__actions' }, createStaffButton('restore', t('Gỡ cấm'), confirmUnban)) : null));
  } else if (staff && muted) {
    box.append(createStaffBox(
      el('div', { className: 'staff-box__top' }, createStaffTag(), el('span', { className: 'staff-box__strong' }, formatRemaining(profile.muted_until))),
      el('p', {}, t('Vẫn đọc được nội dung nhưng không thể đăng bài, bình luận hay thả cảm xúc cho đến {date}.', { date: formatUntilFull(profile.muted_until) })),
      canAct ? el('div', { className: 'staff-box__actions' },
        createStaffButton('mute', t('Gỡ tắt tiếng'), confirmUnmute),
        createStaffButton('clock', t('Gia hạn…'), () => muteProfile(true), true)) : null));
  }

  // Hàng nút: Theo dõi (không có với hồ sơ bị cấm) và Quản trị (chỉ staff, không phải hồ sơ của mình).
  const actions = [];
  if (!isOwn && !banned) {
    actions.push(createFollowButton(profile, 'md'));
  }
  if (staff && !isOwn) {
    actions.push(canAct ? createAdminMenu(muted || banned) : createLockedAdminButton());
  }
  qs('[data-profile-action]').replaceChildren(...actions);
}

/** Nút "Quản trị" bị khoá với người cùng cấp hoặc cao hơn; rê chuột hoặc focus để xem lý do. */
function createLockedAdminButton() {
  return el('span', { className: 'staff-locked', tabindex: '0' },
    el('button', { type: 'button', className: 'staff-trigger', disabled: true, 'aria-describedby': 'staff-locked-tip' }, modIcon('lock', 16), t('Quản trị')),
    el('span', { id: 'staff-locked-tip', className: 'staff-locked__tip', role: 'tooltip' }, modIcon('lock', 14), t('Không thể tác động lên người cùng cấp hoặc cao hơn')));
}

/** Nút "Quản trị" và menu: tắt tiếng / gia hạn / gỡ, cấm / gỡ cấm, đổi vai trò (chỉ Admin). */
function createAdminMenu(outline) {
  const { profile, viewer } = state;
  const muted = isMutedNow(profile.muted_until);
  const banned = profile.status === 'banned';
  const trigger = el('button', { type: 'button', className: 'staff-trigger' + (outline ? ' staff-trigger--outline' : '') }, modIcon('shield', 16), t('Quản trị'));
  const items = [];
  if (!banned) {
    items.push(muted
      ? { icon: 'clock', label: t('Gia hạn tắt tiếng…'), onSelect: () => muteProfile(true) }
      : { icon: 'mute', label: t('Tắt tiếng…'), onSelect: () => muteProfile(false) });
    if (muted) {
      items.push({ icon: 'mute', label: t('Gỡ tắt tiếng'), onSelect: confirmUnmute });
    }
  }
  items.push(banned
    ? { icon: 'restore', label: t('Gỡ cấm'), onSelect: confirmUnban }
    : { icon: 'ban', label: t('Cấm tài khoản…'), danger: true, onSelect: banProfile });
  items.push('divider');
  items.push(viewer.role === 'admin'
    ? { icon: 'userCog', label: t('Đổi vai trò…'), onSelect: changeRole }
    : { icon: 'userCog', label: t('Đổi vai trò…'), sub: t('Chỉ Quản trị viên'), disabled: true });
  return createMenu(trigger, { header: { icon: 'shield', text: t('Quản trị · {name}', { name: getAuthorLabel(profile) }) }, items });
}

/** Cập nhật hồ sơ từ phản hồi của API quản trị rồi vẽ lại thẻ (giữ nguyên danh sách theo dõi). */
function applyProfileUpdate(updated) {
  state.profile = { ...state.profile, ...updated };
  renderProfile();
}

/** Mở hộp thoại tắt tiếng (hoặc gia hạn) và gửi muted_until. */
function muteProfile(extend) {
  openMuteDialog(state.profile, async until => applyProfileUpdate(await setUserMute(state.profile.id, until)), extend);
}

/** Xác nhận rồi gỡ tắt tiếng (gửi muted_until = null). */
function confirmUnmute() {
  openConfirmDialog({
    icon: 'mute', tone: 'amber',
    title: t('Gỡ tắt tiếng {name}?', { name: getAuthorLabel(state.profile) }),
    subtitle: t('Đang tắt tiếng đến {date}', { date: formatUntilFull(state.profile.muted_until) }),
    body: [el('p', { className: 'mod-dialog__text' }, t('Thành viên sẽ đăng bài, bình luận và thả cảm xúc lại được ngay.'))],
    confirmLabel: t('Gỡ tắt tiếng'), confirmIcon: 'check',
    onConfirm: async () => applyProfileUpdate(await setUserMute(state.profile.id, null)),
  });
}

/** Hộp thoại cấm tài khoản (phải gõ đúng tên người dùng). */
function banProfile() {
  openBanDialog(state.profile, async () => applyProfileUpdate(await setUserStatus(state.profile.id, 'banned')));
}

/** Xác nhận rồi gỡ cấm (status = active). */
function confirmUnban() {
  openConfirmDialog({
    icon: 'restore',
    title: t('Gỡ cấm {name}?', { name: getAuthorLabel(state.profile) }),
    subtitle: (MOD_ROLE_LABELS[state.profile.role] || t('Thành viên')) + ' · ' + getAuthorHandle(state.profile),
    body: [el('p', { className: 'mod-dialog__text' }, t('Tài khoản đăng nhập và dùng lại mọi chức năng được ngay.'))],
    confirmLabel: t('Gỡ cấm'), confirmIcon: 'check',
    onConfirm: async () => applyProfileUpdate(await setUserStatus(state.profile.id, 'active')),
  });
}

/** Hộp thoại đổi vai trò (chỉ Admin). */
function changeRole() {
  openRoleDialog(state.profile, async role => applyProfileUpdate(await setUserRole(state.profile.id, role)));
}

/** Cập nhật số người theo dõi / đang theo dõi ở thẻ hồ sơ và trên hai tab. */
function renderCounts() {
  for (const key of ['followers', 'following']) {
    const list = state.lists[key];
    const value = Array.isArray(list) ? list.length : '–';
    qs('[data-count="' + key + '"]').textContent = value;
    qs('[data-tab-count="' + key + '"]').textContent = value;
  }
}

/* ===== Danh sách ===== */

/** Một dòng người dùng: avatar và tên dẫn tới hồ sơ họ, giới thiệu, nút hoặc nhãn "Bạn". */
function createRow(user) {
  const isViewer = state.viewer && user.id === state.viewer.id;
  const nameRow = el('div', { className: 'profile-row__name-row' },
    el('a', { className: 'profile-row__name', href: profileUrl(user) }, wrapJapanese(highlight(getAuthorLabel(user), state.filter))));
  if (isViewer) {
    nameRow.append(el('span', { className: 'profile-row__you' }, t('Bạn')));
  }
  return el('li', { className: 'profile-row' },
    fillAvatar(el('a', { className: 'profile-row__avatar', href: profileUrl(user), 'aria-hidden': 'true', tabindex: '-1' }), user),
    el('div', { className: 'profile-row__text' }, nameRow,
      el('p', { className: 'profile-row__handle' }, wrapJapanese(highlight(getAuthorHandle(user), state.filter))),
      el('p', { className: 'profile-row__bio' }, user.bio ? wrapJapanese(user.bio) : t('Chưa có giới thiệu'))),
    isViewer ? null : createFollowButton(user));
}

/** Trạng thái rỗng: icon tròn hồng, tiêu đề, gợi ý. */
function createEmpty(iconName, title, hint) {
  return el('li', { className: 'profile-empty' },
    el('span', { className: 'profile-empty__icon' }, icon(iconName, 20)),
    el('p', { className: 'profile-empty__title' }, title),
    el('p', { className: 'profile-empty__hint' }, hint));
}

/** Câu thông báo khi danh sách rỗng, khác nhau giữa hồ sơ của mình và người khác. */
function emptyText() {
  const name = getAuthorLabel(state.profile);
  if (state.tab === 'following') {
    return state.isOwn
      ? [t('Bạn chưa theo dõi ai'), t('Theo dõi người khác để không bỏ lỡ bài viết mới của họ.')]
      : [t('{name} chưa theo dõi ai', { name }), t('Danh sách sẽ hiện ở đây khi họ theo dõi thành viên khác.')];
  }
  return state.isOwn
    ? [t('Chưa có ai theo dõi bạn'), t('Hãy đăng bài và bình luận để mọi người biết đến bạn.')]
    : [t('Chưa có ai theo dõi {name}', { name }), t('Hãy là người đầu tiên theo dõi.')];
}

/** Vẽ danh sách của tab đang chọn, áp dụng từ khoá lọc (không phân biệt hoa thường). */
function renderList() {
  const list = state.lists[state.tab];
  const box = qs('[data-list]');
  if (!Array.isArray(list)) {
    box.replaceChildren(el('li', { className: 'profile-list__note' }, t('Đang tải danh sách…')));
    return;
  }
  const needle = state.filter.trim().toLocaleLowerCase('vi');
  const items = needle ? list.filter(user => [user.displayname, user.username, getAuthorHandle(user)]
    .some(value => String(value || '').toLocaleLowerCase('vi').includes(needle))) : list;
  const status = qs('[data-list-status]');
  if (!list.length) {
    box.replaceChildren(createEmpty('users', ...emptyText()));
    status.textContent = t('Danh sách trống.');
    return;
  }
  if (!items.length) {
    box.replaceChildren(createEmpty('search', t('Không tìm thấy “{query}”', { query: state.filter.trim() }), t('Thử tên khác hoặc xóa từ khóa tìm kiếm.')));
    status.textContent = t('Không có người dùng phù hợp.');
    return;
  }
  box.replaceChildren(...items.map(createRow));
  status.textContent = t('{count} người dùng.', { count: items.length });
}

/** Tải lại một danh sách (sau khi theo dõi / bỏ theo dõi) rồi vẽ lại nếu đang xem tab đó. */
async function reloadList(key) {
  const own = state.isOwn;
  const id = state.profile.id;
  state.lists[key] = key === 'followers'
    ? await (own ? listMyFollowers() : listFollowers(id))
    : await (own ? listMyFollowing() : listFollowing(id));
  if (own && key === 'followers') {
    state.viewerFollowers = new Set(state.lists.followers.map(user => user.id));
  }
  renderCounts();
  if (state.tab === key) {
    renderList();
  }
}

/** Chọn tab: cập nhật ARIA, URL (?tab=) và vẽ lại danh sách. */
function selectTab(tab) {
  state.tab = tab;
  for (const button of qsa('[data-tab]')) {
    const active = button.dataset.tab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  }
  qs('[data-list]').setAttribute('aria-labelledby', 'tab-' + tab);
  const url = new URL(location.href);
  url.searchParams.set('tab', tab);
  history.replaceState(null, '', url.pathname + url.search);
  renderList();
}

/** Bấm tab, hoặc dùng mũi tên trái/phải để chuyển tab. */
function handleTabs(event) {
  const tab = event.target.closest('[data-tab]');
  if (!tab) {
    return;
  }
  if (event.type === 'click') {
    selectTab(tab.dataset.tab);
  } else if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    const next = tab.dataset.tab === 'followers' ? 'following' : 'followers';
    selectTab(next);
    qs('[data-tab="' + next + '"]').focus();
  }
}

/** Gõ vào ô lọc: lọc ngay danh sách đã tải, hiện nút xoá khi có chữ. */
function handleFilter() {
  const input = qs('[data-filter-input]');
  state.filter = input.value;
  const filled = Boolean(input.value.trim());
  qs('[data-filter]').classList.toggle('is-filled', filled);
  qs('[data-filter-clear]').hidden = !filled;
  renderList();
}

/** Nút × xoá từ khoá và trả focus về ô lọc. */
function clearFilter() {
  const input = qs('[data-filter-input]');
  input.value = '';
  handleFilter();
  input.focus();
}

/* ===== Khởi tạo ===== */

/** Xác định hồ sơ cần xem, tải hồ sơ, hai danh sách và quan hệ theo dõi của người xem. */
async function initialize() {
  mountPetals();
  const requestedId = params.get('id');
  state.viewer = await fetchCurrentUser();
  // Không có id: đây là hồ sơ của mình nên bắt buộc đăng nhập.
  if (!requestedId && !state.viewer) {
    await requireAuth();
    return;
  }
  state.isOwn = !requestedId || requestedId === state.viewer?.id;
  try {
    state.profile = state.isOwn
      ? { ...state.viewer, avatar_url: state.viewer.avatarUrl, muted_until: state.viewer.mutedUntil }
      : await getUser(requestedId);
  } catch (error) {
    // Không tải được hồ sơ: ẩn hai thẻ đang chờ (thanh xám) và chỉ để lại thông báo lỗi.
    qs('[data-profile-card]').hidden = true;
    qs('.profile-connect').hidden = true;
    showError(error.status === 404 || error.status === 400 ? t('Không tìm thấy người dùng này.') : toVietnameseMessage(error));
    return;
  }
  renderProfile();
  selectTab(state.tab);
  try {
    // Quan hệ của người xem (một yêu cầu mỗi loại) để vẽ đúng nút ở mọi dòng.
    // Hồ sơ của mình thì hai danh sách này cũng chính là nội dung hai tab, không gọi lại lần nữa.
    let myFollowing = [];
    let myFollowers = [];
    if (state.viewer) {
      myFollowing = await listMyFollowing() || [];
      myFollowers = await listMyFollowers() || [];
      state.viewerFollowing = new Set(myFollowing.map(user => user.id));
      state.viewerFollowers = new Set(myFollowers.map(user => user.id));
    }
    if (state.isOwn) {
      state.lists.following = myFollowing;
      state.lists.followers = myFollowers;
    } else {
      state.lists.followers = await listFollowers(state.profile.id) || [];
      state.lists.following = await listFollowing(state.profile.id) || [];
    }
  } catch (error) {
    showError(toVietnameseMessage(error));
  }
  renderProfile();
  renderCounts();
  renderList();
}

// Gắn sự kiện một lần cho các điều khiển tĩnh trong HTML.
qs('[data-tabs]').addEventListener('click', handleTabs);
qs('[data-tabs]').addEventListener('keydown', handleTabs);
qs('[data-filter-input]').addEventListener('input', handleFilter);
qs('[data-filter-clear]').addEventListener('click', clearFilter);
initialize().catch(error => showError(toVietnameseMessage(error)));
