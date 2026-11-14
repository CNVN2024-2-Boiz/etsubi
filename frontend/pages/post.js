/** Trang đọc bài (Figma Reading Page): tải bài, tác giả, thảo luận và sidebar từ API thật. */
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { getPost, getPostTags, listUserPosts, translatePost, getRelatedPosts, getPostPlace, updatePost, deletePost } from '/services/api/posts.js';
import { listComments, createComment, deleteComment, translateComment, getEmbeddedAuthor, setCommentsLocked } from '/services/api/comment.js';
import { setPostStatus, restorePost, getPostForStaff, listCommentsForStaff, setCommentStatus, restoreComment, setUserMute } from '/services/api/manage.js';
import {
  isStaff, canModerateUser, isMutedNow, formatUntil, formatUntilFull, createStaffTag, createStatusBadge, createStaffBox,
  createStaffButton, createMenu, createMoreButton, modIcon, openConfirmDialog, openMuteDialog,
} from '/components/moderation/moderation.js';
import { getReactionSummary, getMyReaction, reactToPost, removeReaction, LIKE_EMOJI } from '/services/api/reactions.js';
import { bookmarkPost, unbookmarkPost, isPostBookmarked } from '/services/api/bookmarks.js';
import { followUser, unfollowUser, isFollowing, listFollowers } from '/services/api/follows.js';
import { getUser } from '/services/api/users.js';
import { fetchCurrentUser, getCachedUser, requireAuth } from '/utils/auth.js';
import { el, qs } from '/utils/dom.js';
import { initials } from '/utils/format.js';
import { wrapJapanese } from '/utils/text.js';
import { toVietnameseMessage, translationErrorMessage } from '/utils/errors.js';
import { routes, searchUrl } from '/utils/routes.js';

// Header có tab Diễn đàn đang chọn và ô tìm kiếm trong suốt như frame Figma; footer đầy đủ.
mountHeader(qs('[data-component="header"]'), { active: 'forum', searchForm: true });
mountFooter();

// Kanji trang trí cho ô vuông của bài liên quan, chọn theo tên tag (giống Trang chủ).
const TAG_KANJI = { general: '総', question: '問', discussion: '談', announcement: '告', showcase: '作' };

// Trạng thái trang: bài đang đọc, người xem, tác giả, bình luận và các bộ đếm thật.
const postId = new URLSearchParams(location.search).get('id');
const state = {
  post: null,
  viewer: getCachedUser(),
  author: null,
  tags: [],
  comments: [],
  commentAuthors: new Map(),
  likeCount: null,
  myEmoji: null,
  bookmarked: false,
  following: false,
  postCount: null,
  followerCount: null,
  translated: null,
  showTranslation: false,
  // Thời điểm bài bị xoá trong phiên này (staff vẫn thấy bài và có nút Khôi phục).
  deletedAt: null,
};

/* ===== Tiện ích hiển thị ===== */

/** Thanh chờ tĩnh dùng khi dữ liệu chưa có, không giả nội dung. */
function placeholder(extraClass = '') {
  return el('span', { className: 'u-placeholder-bar ' + extraClass, 'aria-hidden': 'true' });
}

/** Báo lỗi chung của trang bằng vùng alert, không dùng alert() của trình duyệt. */
function showPageError(message) {
  const box = qs('[data-page-error]');
  box.textContent = message;
  box.hidden = false;
}

/** Hiện thông báo ngắn dưới nhóm nút thao tác (đã sao chép, lỗi lưu bài...). */
function showActionStatus(message, isError = false) {
  const status = qs('[data-action-status]');
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

/** Đổi ngày ISO thành "25/03/2026" theo giờ máy người xem. */
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Đổi thời gian bình luận thành "25/03 · 14:20"; thêm năm khi khác năm hiện tại. */
function formatCommentTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  // Tự ghép số có 2 chữ số vì toLocaleDateString của vi-VN trả "14-11" khi bỏ năm.
  const pad = number => String(number).padStart(2, '0');
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const day = pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + (sameYear ? '' : '/' + date.getFullYear());
  return day + ' · ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

/** Ước lượng thời gian đọc từ nội dung thật: 200 từ mỗi phút, chữ Nhật tính 500 ký tự mỗi phút. */
function readingMinutes(content) {
  const text = String(content || '');
  const japanese = (text.match(/[぀-ヿ㐀-鿿]/gu) || []).length;
  const words = text.replace(/[぀-ヿ㐀-鿿]/gu, ' ').split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200 + japanese / 500));
}

/** Cờ theo tiếng mẹ đẻ (vi → VN, ja → JP, en → nhãn EN) như mô tả component Flag trong Figma. */
function createFlag(native, small = false) {
  const sizeClass = 'post-flag' + (small ? ' post-flag--sm' : '');
  if (native === 'vi' || native === 'ja') {
    const country = native === 'vi' ? 'vn' : 'jp';
    return el('img', {
      className: sizeClass,
      src: '/assets/icons/flag-' + country + '.svg',
      alt: native === 'vi' ? 'Việt Nam' : 'Nhật Bản',
      width: small ? 26 : 29,
      height: small ? 18 : 20,
    });
  }
  if (native === 'en') {
    return el('span', { className: sizeClass + ' post-flag--label', title: 'Tiếng Anh' }, 'EN');
  }
  return null;
}

/** Avatar tròn: ảnh thật nếu có, hỏng ảnh thì quay về chữ đầu tên. */
function fillAvatar(avatar, user) {
  avatar.replaceChildren(initials(user.username));
  if (user.avatar_url) {
    const image = el('img', { src: user.avatar_url, alt: '', loading: 'lazy' });
    /** Ảnh lỗi thì hiện lại chữ đầu tên để không còn khung trống. */
    function useInitials() {
      avatar.replaceChildren(initials(user.username));
    }
    image.addEventListener('error', useInitials, { once: true });
    avatar.replaceChildren(image);
  }
  return avatar;
}

/** Đưa người chưa đăng nhập tới trang đăng nhập; trả về true nếu đã có phiên. */
async function ensureSignedIn() {
  return requireAuth();
}

/* ===== Cánh hoa ===== */

/** Mười cánh hoa tĩnh hai bên lề; vị trí và góc nằm trong token CSS, không inline style. */
function mountPetals() {
  // Mỗi cánh dùng đúng file SVG có kích thước khớp với Figma (đã đối chiếu khung bao).
  const files = [1, 3, 5, 1, 3, 11, 2, 6, 4, 12];
  const layer = qs('[data-petals]');
  files.forEach((file, index) => {
    layer.append(el('img', {
      className: 'post-petal post-petal--' + (index + 1),
      src: '/assets/illustrations/sakura-' + file + '.svg',
      alt: '',
    }));
  });
}

/* ===== Bài viết ===== */

/** Điền hàng tác giả: avatar, tên (liên kết hồ sơ), cờ, ngày đăng và thời gian đọc. */
function renderAuthorRow() {
  const { post, author } = state;
  const row = qs('[data-author]');
  const avatar = el('span', { className: 'post-author__avatar', 'aria-hidden': 'true' });
  const info = el('div', { className: 'post-author__info' });
  if (author) {
    fillAvatar(avatar, author);
    info.append(el('div', { className: 'post-author__name-row' },
      el('a', { className: 'post-author__name', href: routes.profile + '?id=' + encodeURIComponent(author.id) },
        wrapJapanese(author.username), createFlag(author.native)),
      // Nhãn "Đã ẩn" / "Đã xoá" chỉ staff thấy (người thường không mở được bài này).
      state.deletedAt ? createStatusBadge('deleted') : post.status === 'hidden' ? createStatusBadge('hidden') : null));
  } else {
    avatar.classList.add('post-author__avatar--placeholder');
    info.append(placeholder('u-placeholder-bar--title post-author__bar'));
  }
  info.append(el('p', { className: 'post-author__meta' },
    formatDate(post.created_at) + ' · ' + readingMinutes(post.content) + ' phút đọc'));
  row.replaceChildren(avatar, info, createPostMenu() || '');
}

/** Tách nội dung thành đoạn văn; đoạn mà mọi dòng bắt đầu bằng ">" thành khối trích dẫn. */
function renderBody(content, language) {
  const body = qs('[data-body]');
  const blocks = String(content || '').replace(/\r\n/g, '\n').split(/\n\s*\n/u).map(block => block.trim()).filter(Boolean);
  if (!blocks.length) {
    body.replaceChildren(el('p', { className: 'post-body__empty' }, 'Bài viết chưa có nội dung.'));
    return;
  }
  const nodes = blocks.map(block => {
    const lines = block.split('\n');
    if (lines.every(line => line.trim().startsWith('>'))) {
      const text = lines.map(line => line.trim().replace(/^>\s?/u, '')).join('\n');
      return el('blockquote', { className: 'post-body__quote' }, wrapJapanese(text));
    }
    return el('p', { className: 'post-body__paragraph' }, wrapJapanese(block));
  });
  body.lang = language === 'ja' ? 'ja' : language === 'en' ? 'en' : 'vi';
  body.replaceChildren(...nodes);
}

/** Hiện tiêu đề và thân bài theo bản gốc hoặc bản dịch đang chọn. */
function renderContent() {
  const { post, translated, showTranslation } = state;
  const useTranslation = showTranslation && translated;
  const title = useTranslation ? translated.title : post.title;
  const titleNode = qs('[data-title]');
  titleNode.replaceChildren(wrapJapanese(title));
  titleNode.lang = useTranslation ? translated.language : post.language === 'ja' ? 'ja' : '';
  if (!titleNode.lang) {
    titleNode.removeAttribute('lang');
  }
  renderBody(useTranslation ? translated.content : post.content, useTranslation ? translated.language : post.language);
  const button = qs('[data-translate]');
  button.setAttribute('aria-pressed', String(Boolean(useTranslation)));
  qs('[data-translate-label]').textContent = useTranslation ? 'Xem bản gốc' : 'Dịch bài viết';
}

/** Bấm "Dịch bài viết": gọi API một lần, lần sau chỉ đổi qua lại giữa bản gốc và bản dịch. */
async function toggleTranslation() {
  const status = qs('[data-translate-status]');
  status.classList.remove('is-error');
  if (state.showTranslation) {
    state.showTranslation = false;
    status.textContent = '';
    renderContent();
    return;
  }
  if (!state.translated) {
    if (!await ensureSignedIn()) {
      return;
    }
    const button = qs('[data-translate]');
    button.disabled = true;
    status.textContent = 'Đang dịch…';
    try {
      state.translated = await translatePost(state.post.id);
    } catch (error) {
      status.textContent = translationErrorMessage(error);
      status.classList.add('is-error');
      return;
    } finally {
      button.disabled = false;
    }
  }
  state.showTranslation = true;
  // API báo translated=false khi bài đã ở đúng ngôn ngữ của người xem.
  status.textContent = state.translated.translated ? 'Đang xem bản dịch.' : 'Bài viết đã ở ngôn ngữ của bạn.';
  renderContent();
}

/* ===== Kiểm duyệt bài viết (Figma 1:2435, khu "Bài viết") ===== */

/**
 * Nút "···" ở hàng tác giả: staff có menu "Kiểm duyệt bài viết" (ẩn/hiện, khoá bình luận, xoá);
 * tác giả có menu "Bài viết của bạn" (chỉnh sửa, khoá bình luận, xoá). Người khác không có nút.
 */
function createPostMenu() {
  const { post, viewer } = state;
  const staff = isStaff(viewer);
  const isAuthor = Boolean(viewer && viewer.id === post.author_id);
  if ((!staff && !isAuthor) || state.deletedAt) {
    return null;
  }
  const items = [];
  if (isAuthor) {
    items.push({ icon: 'pencil', label: 'Chỉnh sửa bài viết', onSelect: startEdit });
  }
  if (staff) {
    items.push(post.status === 'hidden'
      ? { icon: 'eye', label: 'Hiện lại bài viết', onSelect: () => changePostStatus('published') }
      : { icon: 'eyeOff', label: 'Ẩn bài viết', onSelect: () => changePostStatus('hidden') });
  }
  items.push(post.comments_locked
    ? { icon: 'unlock', label: 'Mở khoá bình luận', onSelect: () => toggleCommentsLock(false) }
    : { icon: 'lock', label: 'Khoá bình luận', onSelect: () => toggleCommentsLock(true) });
  items.push('divider', { icon: 'trash', label: 'Xoá bài viết…', danger: true, onSelect: confirmDeletePost });
  const header = staff ? { icon: 'shield', text: 'Kiểm duyệt bài viết' } : { text: 'Bài viết của bạn' };
  const menu = createMenu(createMoreButton('Tuỳ chọn bài viết'), { header, items });
  menu.classList.add('post-author__menu');
  return menu;
}

/** Khối chỉ staff thấy ở đầu bài khi bài đang bị ẩn hoặc đã xoá; nội dung bài được làm mờ. */
function renderPostModeration() {
  const slot = qs('[data-post-staff]');
  const hidden = state.post.status === 'hidden';
  const deleted = Boolean(state.deletedAt);
  qs('[data-article]').classList.toggle('is-faded', hidden || deleted);
  slot.replaceChildren();
  if (!isStaff(state.viewer)) {
    return;
  }
  if (deleted) {
    slot.append(createStaffBox(el('div', { className: 'staff-box__top post-staff-row' }, createStaffTag(),
      el('span', { className: 'post-staff-row__text' }, 'Đã xoá lúc ' + formatUntilFull(state.deletedAt)),
      createStaffButton('restore', 'Khôi phục', confirmRestorePost))));
  } else if (hidden) {
    slot.append(createStaffBox(el('div', { className: 'staff-box__top post-staff-row' }, createStaffTag(),
      el('span', { className: 'post-staff-row__text' }, 'Bài viết đang bị ẩn khỏi mọi người.'),
      createStaffButton('eye', 'Hiện lại', () => changePostStatus('published')))));
  }
}

/** Vẽ lại các phần phụ thuộc trạng thái bài sau một thao tác quản trị. */
function refreshPostState() {
  renderAuthorRow();
  renderPostModeration();
  applyCommentPermissions();
  renderComments();
}

/** Ẩn hoặc hiện lại bài (staff), qua hộp thoại xác nhận. */
function changePostStatus(status) {
  const hiding = status === 'hidden';
  openConfirmDialog({
    icon: hiding ? 'eyeOff' : 'eye',
    title: hiding ? 'Ẩn bài viết này?' : 'Hiện lại bài viết này?',
    subtitle: '“' + state.post.title + '” · ' + (state.author?.username || ''),
    body: [el('p', { className: 'mod-dialog__text' }, hiding
      ? 'Thành viên thường mở liên kết sẽ gặp trang không tìm thấy. Điều hành viên và Quản trị viên vẫn thấy bài và có thể hiện lại.'
      : 'Bài viết sẽ hiện lại với mọi người như trước khi bị ẩn.')],
    confirmLabel: hiding ? 'Ẩn bài viết' : 'Hiện lại',
    confirmIcon: hiding ? 'eyeOff' : 'eye',
    onConfirm: async () => {
      state.post = { ...state.post, ...await setPostStatus(state.post.id, status, { authorId: state.post.author_id, title: state.post.title }) };
      refreshPostState();
    },
  });
}

/** Khoá / mở khoá bình luận (tác giả hoặc staff). */
function toggleCommentsLock(locked) {
  openConfirmDialog({
    icon: locked ? 'lock' : 'unlock',
    title: locked ? 'Khoá bình luận?' : 'Mở khoá bình luận?',
    subtitle: '“' + state.post.title + '”',
    body: [el('p', { className: 'mod-dialog__text' }, locked
      ? 'Ô viết bình luận được thay bằng thông báo; các bình luận cũ vẫn hiện.'
      : 'Mọi người bình luận lại được trên bài viết này.')],
    confirmLabel: locked ? 'Khoá bình luận' : 'Mở khoá',
    confirmIcon: locked ? 'lock' : 'unlock',
    onConfirm: async () => {
      state.post = { ...state.post, ...await setCommentsLocked(state.post.id, locked, { authorId: state.post.author_id }) };
      refreshPostState();
    },
  });
}

/** Xoá bài (xoá mềm): staff ở lại trang để khôi phục được; tác giả quay về Diễn đàn. */
function confirmDeletePost() {
  const staff = isStaff(state.viewer);
  openConfirmDialog({
    icon: 'trash',
    title: 'Xoá bài viết này?',
    subtitle: '“' + state.post.title + '” · ' + (state.author?.username || ''),
    body: [el('p', { className: 'mod-dialog__text' }, 'Bài viết và toàn bộ bình luận sẽ không còn hiển thị với mọi người. Điều hành viên và Quản trị viên vẫn có thể khôi phục trong trang quản lý.')],
    confirmLabel: 'Xoá bài viết',
    confirmIcon: 'trash',
    onConfirm: async () => {
      await deletePost(state.post.id, { authorId: state.post.author_id, title: state.post.title });
      if (!staff) {
        location.assign(routes.forum);
        return;
      }
      state.deletedAt = new Date().toISOString();
      refreshPostState();
    },
  });
}

/** Khôi phục bài đã xoá (staff). */
function confirmRestorePost() {
  openConfirmDialog({
    icon: 'restore',
    title: 'Khôi phục bài viết?',
    subtitle: '“' + state.post.title + '”',
    body: [el('p', { className: 'mod-dialog__text' }, 'Bài viết và bình luận hiện lại với mọi người như trước khi bị xoá.')],
    confirmLabel: 'Khôi phục',
    confirmIcon: 'restore',
    onConfirm: async () => {
      state.post = { ...state.post, ...await restorePost(state.post.id) };
      state.deletedAt = null;
      refreshPostState();
    },
  });
}

/** Chỉnh sửa bài ngay trên trang (tác giả): ô tiêu đề và nội dung thay cho bài, Lưu gửi PATCH /posts/{id}. */
function startEdit() {
  const article = qs('[data-article]');
  if (qs('[data-edit-form]', article)) {
    return;
  }
  const titleInput = el('input', { id: 'edit-title', className: 'input', type: 'text', maxlength: '255', value: state.post.title });
  const contentInput = el('textarea', { id: 'edit-content', className: 'input post-edit__content', rows: '10' }, state.post.content || '');
  const status = el('p', { className: 'field__hint', role: 'status' });
  const save = el('button', { type: 'submit', className: 'btn btn--primary' }, 'Lưu thay đổi');
  const cancel = el('button', { type: 'button', className: 'btn btn--secondary' }, 'Huỷ');
  const form = el('form', { className: 'post-edit', 'data-edit-form': '', novalidate: true },
    el('div', { className: 'field' }, el('label', { className: 'field__label', for: 'edit-title' }, 'Tiêu đề'), titleInput),
    el('div', { className: 'field' }, el('label', { className: 'field__label', for: 'edit-content' }, 'Nội dung'), contentInput),
    status, el('div', { className: 'post-edit__actions' }, cancel, save));
  const parts = ['[data-title]', '.post-translate', '[data-body]'].map(selector => qs(selector, article));

  /** Đóng biểu mẫu sửa và hiện lại bài. */
  function close() {
    form.remove();
    parts.forEach(part => {
      part.hidden = false;
    });
  }

  /** Lưu: gửi tiêu đề, nội dung và toạ độ cũ; thành công thì vẽ lại bài. */
  async function submit(event) {
    event.preventDefault();
    save.disabled = true;
    save.textContent = 'Đang lưu…';
    try {
      const updated = await updatePost(state.post.id, {
        title: titleInput.value.trim(), content: contentInput.value, latitude: state.post.latitude, longitude: state.post.longitude,
      });
      state.post = { ...state.post, ...updated };
      state.translated = null;
      state.showTranslation = false;
      close();
      renderContent();
      qs('[data-breadcrumb-title]').replaceChildren(wrapJapanese(state.post.title));
      document.title = state.post.title + ' · Etsubi';
    } catch (error) {
      status.textContent = toVietnameseMessage(error);
      status.classList.add('field__hint--error');
    } finally {
      save.disabled = false;
      save.textContent = 'Lưu thay đổi';
    }
  }

  cancel.addEventListener('click', close);
  form.addEventListener('submit', submit);
  parts.forEach(part => {
    part.hidden = true;
  });
  parts[0].before(form);
  titleInput.focus();
}

/* ===== Kiểm duyệt bình luận ===== */

/** Menu "···" của staff trên một bình luận: ẩn, xoá, tắt tiếng người viết (khoá nếu cùng cấp hoặc cao hơn). */
function createCommentMenu(comment, author) {
  const canMute = author && canModerateUser(state.viewer, author);
  return createMenu(createMoreButton('Kiểm duyệt bình luận'), {
    header: { icon: 'shield', text: 'Kiểm duyệt bình luận' },
    items: [
      { icon: 'eyeOff', label: 'Ẩn bình luận', onSelect: () => moderateComment(comment, 'hide') },
      { icon: 'trash', label: 'Xoá bình luận…', danger: true, onSelect: () => moderateComment(comment, 'delete') },
      'divider',
      canMute
        ? { icon: 'mute', label: 'Tắt tiếng người viết…', onSelect: () => muteAuthor(author) }
        : { icon: 'mute', label: 'Tắt tiếng người viết…', sub: 'Không thể với người cùng cấp hoặc cao hơn', disabled: true },
    ],
  });
}

/** Ẩn, hiện lại, xoá hoặc khôi phục một bình luận (staff), luôn qua hộp thoại xác nhận. */
function moderateComment(comment, action) {
  const texts = {
    hide: ['eyeOff', 'Ẩn bình luận này?', 'Thành viên thường không còn thấy bình luận. Staff vẫn thấy và có thể hiện lại.', 'Ẩn bình luận'],
    show: ['eye', 'Hiện lại bình luận?', 'Bình luận hiện lại với mọi người.', 'Hiện lại'],
    delete: ['trash', 'Xoá bình luận này?', 'Mọi người thấy dòng giữ chỗ "Bình luận này đã bị xoá". Staff vẫn khôi phục được.', 'Xoá bình luận'],
    restore: ['restore', 'Khôi phục bình luận?', 'Bình luận hiện lại với mọi người như trước khi bị xoá.', 'Khôi phục'],
  };
  const [iconName, title, text, label] = texts[action];
  const author = state.commentAuthors.get(comment.user_id);
  openConfirmDialog({
    icon: iconName,
    title,
    subtitle: (author ? author.username + ' · ' : '') + '“' + String(comment.content).slice(0, 60) + (comment.content.length > 60 ? '…' : '') + '”',
    body: [el('p', { className: 'mod-dialog__text' }, text)],
    confirmLabel: label,
    confirmIcon: iconName,
    onConfirm: async () => {
      let updated;
      if (action === 'hide' || action === 'show') {
        updated = await setCommentStatus(comment.id, action === 'hide' ? 'hidden' : 'visible');
      } else if (action === 'delete') {
        await deleteComment(comment.id);
        updated = { ...comment, is_deleted: true };
      } else {
        updated = await restoreComment(comment.id);
      }
      state.comments = state.comments.map(item => (item.id === comment.id ? { ...item, ...updated } : item));
      renderComments();
    },
  });
}

/** Tắt tiếng người viết bình luận ngay từ menu bình luận. */
function muteAuthor(author) {
  openMuteDialog(author, async until => {
    const updated = await setUserMute(author.id, until);
    state.commentAuthors.set(author.id, { ...author, ...updated });
    showActionStatus(author.username + ' bị tắt tiếng đến ' + formatUntil(updated.muted_until) + '.');
  });
}

/* ===== Thích, lưu, chia sẻ ===== */

/** Cập nhật pill thích: số lượt thật từ tổng cảm xúc, trạng thái đã thích của người xem. */
function renderLike() {
  const button = qs('[data-like]');
  button.setAttribute('aria-pressed', String(Boolean(state.myEmoji)));
  qs('[data-like-count]').textContent = state.likeCount ?? '–';
}

/** Bấm thích: thả tim nếu chưa có cảm xúc, bỏ cảm xúc nếu đã có; số đếm chỉ đổi khi API thành công. */
async function toggleLike() {
  if (!await ensureSignedIn()) {
    return;
  }
  const button = qs('[data-like]');
  button.disabled = true;
  try {
    if (state.myEmoji) {
      await removeReaction(state.post.id);
      state.myEmoji = null;
      state.likeCount = Math.max(0, (state.likeCount ?? 1) - 1);
    } else {
      const reaction = await reactToPost(state.post.id, LIKE_EMOJI, { authorId: state.post.author_id, previousEmoji: state.myEmoji });
      state.myEmoji = reaction?.emoji || '❤️';
      state.likeCount = (state.likeCount ?? 0) + 1;
    }
    renderLike();
    showActionStatus('');
  } catch (error) {
    showActionStatus(toVietnameseMessage(error), true);
  } finally {
    button.disabled = false;
  }
}

/** Cập nhật pill lưu bài: "Lưu" hoặc "Đã lưu" kèm aria-pressed. */
function renderBookmark() {
  qs('[data-bookmark]').setAttribute('aria-pressed', String(state.bookmarked));
  qs('[data-bookmark-label]').textContent = state.bookmarked ? 'Đã lưu' : 'Lưu';
}

/** Bấm lưu: gọi POST hoặc DELETE /posts/{id}/bookmark rồi đổi trạng thái. */
async function toggleBookmark() {
  if (!await ensureSignedIn()) {
    return;
  }
  const button = qs('[data-bookmark]');
  button.disabled = true;
  try {
    if (state.bookmarked) {
      await unbookmarkPost(state.post.id);
    } else {
      await bookmarkPost(state.post.id);
    }
    state.bookmarked = !state.bookmarked;
    renderBookmark();
    showActionStatus(state.bookmarked ? 'Đã lưu bài viết.' : 'Đã bỏ lưu bài viết.');
  } catch (error) {
    showActionStatus(toVietnameseMessage(error), true);
  } finally {
    button.disabled = false;
  }
}

/** Chia sẻ: dùng bảng chia sẻ của thiết bị nếu có, nếu không thì sao chép liên kết. */
async function sharePost() {
  const url = location.origin + routes.post(state.post.id);
  try {
    if (navigator.share) {
      await navigator.share({ title: state.post.title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    showActionStatus('Đã sao chép liên kết bài viết.');
  } catch (error) {
    // Người dùng tự đóng bảng chia sẻ thì không cần báo lỗi.
    if (error?.name !== 'AbortError') {
      showActionStatus('Không sao chép được, hãy sao chép địa chỉ trên thanh trình duyệt.', true);
    }
  }
}

/* ===== Thảo luận ===== */

/** Cập nhật số bình luận thật trong tiêu đề "Thảo luận (n)" (không tính bình luận đã xoá). */
function renderCommentCount() {
  // Chỉ đếm bình luận mọi người thấy (không tính bình luận đã ẩn hoặc đã xoá mà staff vẫn thấy).
  const visible = state.comments.filter(comment => !comment.is_deleted && comment.status !== 'hidden').length;
  qs('[data-comment-count]').textContent = visible;
}

/** Bấm "Dịch" của một bình luận: tải bản dịch một lần, sau đó đổi qua lại với bản gốc. */
async function toggleCommentTranslation(comment, button, textNode, note) {
  if (comment.showTranslation) {
    comment.showTranslation = false;
    textNode.replaceChildren(wrapJapanese(comment.content));
    button.textContent = 'Dịch';
    note.textContent = '';
    return;
  }
  if (!comment.translation) {
    if (!await ensureSignedIn()) {
      return;
    }
    button.disabled = true;
    note.classList.remove('is-error');
    note.textContent = 'Đang dịch…';
    try {
      comment.translation = await translateComment(comment.id);
    } catch (error) {
      note.textContent = translationErrorMessage(error);
      note.classList.add('is-error');
      return;
    } finally {
      button.disabled = false;
    }
  }
  comment.showTranslation = true;
  textNode.replaceChildren(wrapJapanese(comment.translation.content));
  button.textContent = 'Bản gốc';
  note.classList.remove('is-error');
  note.textContent = comment.translation.translated ? 'Đang xem bản dịch.' : 'Bình luận đã ở ngôn ngữ của bạn.';
}

/** Xoá bình luận của chính mình: bấm lần đầu đổi thành "Xác nhận xoá", bấm lần hai mới gọi API. */
async function handleDelete(comment, button, note) {
  if (button.dataset.confirm !== 'true') {
    button.dataset.confirm = 'true';
    button.textContent = 'Xác nhận xoá';
    return;
  }
  button.disabled = true;
  try {
    await deleteComment(comment.id);
    state.comments = state.comments.filter(item => item.id !== comment.id);
    renderComments();
  } catch (error) {
    button.disabled = false;
    note.textContent = toVietnameseMessage(error);
    note.classList.add('is-error');
  }
}

/** Dựng một bình luận: avatar, tên, thời gian, nút Dịch/Xoá, nội dung và các trả lời bên dưới. */
function createCommentNode(comment, replies = []) {
  const author = state.commentAuthors.get(comment.user_id);
  const avatar = el('span', { className: 'avatar post-comment__avatar', 'aria-hidden': 'true' });
  if (author) {
    fillAvatar(avatar, author);
  } else {
    avatar.classList.add('post-comment__avatar--placeholder');
  }
  const who = el('div', { className: 'post-comment__who' },
    author ? el('span', { className: 'post-comment__name' }, wrapJapanese(author.username))
      : placeholder('post-comment__name-bar'),
    el('time', { className: 'post-comment__time', datetime: comment.created_at }, formatCommentTime(comment.created_at)));
  const staff = isStaff(state.viewer);
  const text = el('p', { className: 'post-comment__text' + (comment.is_deleted ? ' post-comment__text--deleted' : '') },
    comment.is_deleted ? 'Bình luận này đã bị xoá.' : wrapJapanese(comment.showTranslation ? comment.translation.content : comment.content));
  const note = el('p', { className: 'post-comment__note', role: 'status' });
  const tools = el('div', { className: 'post-comment__tools' });
  if (!comment.is_deleted) {
    const translateButton = el('button', { type: 'button', className: 'post-comment__tool' },
      comment.showTranslation ? 'Bản gốc' : 'Dịch');
    translateButton.addEventListener('click', () => toggleCommentTranslation(comment, translateButton, text, note));
    tools.append(translateButton);
    // Người viết (không phải staff) thấy nút xoá; staff dùng menu kiểm duyệt. Backend vẫn kiểm tra quyền.
    if (state.viewer && state.viewer.id === comment.user_id && !staff) {
      const deleteButton = el('button', { type: 'button', className: 'post-comment__tool post-comment__tool--muted' }, 'Xoá');
      deleteButton.addEventListener('click', () => handleDelete(comment, deleteButton, note));
      tools.append(deleteButton);
    }
  }
  // Staff: menu "···" trên bình luận đang hiện; nút Hiện lại / Khôi phục cho bình luận đã ẩn / đã xoá.
  if (staff && !comment.is_deleted && comment.status !== 'hidden') {
    tools.append(createCommentMenu(comment, author));
  }
  const content = el('div', { className: 'post-comment__content' }, el('div', { className: 'post-comment__head' }, who, tools), text);
  if (staff && comment.is_deleted) {
    content.append(el('div', { className: 'post-comment__staff' }, createStaffTag(),
      createStaffButton('restore', 'Khôi phục', () => moderateComment(comment, 'restore'))));
  } else if (staff && comment.status === 'hidden') {
    const links = el('div', { className: 'post-comment__tools' },
      el('button', { type: 'button', className: 'post-comment__tool post-comment__tool--strong', 'data-action': 'show' }, 'Hiện lại'),
      el('button', { type: 'button', className: 'post-comment__tool', 'data-action': 'delete' }, 'Xoá'));
    // Hai nút chữ của bình luận đang ẩn: Hiện lại hoặc Xoá (đều qua hộp thoại xác nhận).
    links.addEventListener('click', event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action) {
        moderateComment(comment, action);
      }
    });
    content.append(links);
  }
  content.append(note);
  let node = el('div', { className: 'post-comment' + (comment.status === 'hidden' ? ' post-comment--hidden' : '') },
    el('div', { className: 'post-comment__row' }, avatar, content));
  if (staff && comment.status === 'hidden' && !comment.is_deleted) {
    // Bình luận đang ẩn nằm trong khối viền đứt chỉ staff thấy, kèm nhãn "Đã ẩn".
    node = el('div', { className: 'post-comment' }, createStaffBox(
      el('div', { className: 'staff-box__top' }, createStaffTag(), createStatusBadge('hidden')), node));
  }
  if (replies.length) {
    node.append(el('div', { className: 'post-comment__replies' },
      replies.map(reply => createCommentNode(reply))));
  }
  return node;
}

/** Vẽ lại danh sách: bình luận gốc theo thứ tự đã chọn, trả lời luôn cũ trước dưới bình luận cha. */
function renderComments() {
  const box = qs('[data-comments]');
  renderCommentCount();
  if (!state.comments.length) {
    // Bài đã khoá bình luận thì không mời người đọc viết bình luận đầu tiên.
    box.replaceChildren(el('p', { className: 'post-comments__note' }, state.post.comments_locked
      ? 'Chưa có bình luận nào.' : 'Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nhận.'));
    return;
  }
  const order = qs('[data-comment-sort]').value;
  const byTime = (a, b) => new Date(a.created_at) - new Date(b.created_at);
  const ids = new Set(state.comments.map(comment => comment.id));
  // Trả lời có cha không còn trong danh sách được coi như bình luận gốc để không bị mất.
  const roots = state.comments.filter(comment => !comment.parent_id || !ids.has(comment.parent_id)).sort(byTime);
  if (order === 'newest') {
    roots.reverse();
  }
  box.replaceChildren(...roots.map(root => createCommentNode(root,
    state.comments.filter(comment => comment.parent_id === root.id).sort(byTime))));
}

/** Tải hồ sơ người bình luận lần lượt (tôn trọng giới hạn 4 yêu cầu/giây), vẽ lại sau mỗi người. */
async function loadCommentAuthors() {
  for (const comment of state.comments) {
    const embedded = getEmbeddedAuthor(comment);
    if (embedded) {
      state.commentAuthors.set(comment.user_id, embedded);
    }
  }
  const missing = [...new Set(state.comments.map(comment => comment.user_id))]
    .filter(id => !state.commentAuthors.has(id));
  for (const id of missing) {
    try {
      state.commentAuthors.set(id, await getUser(id));
      renderComments();
    } catch {
      // Hồ sơ lỗi thì giữ thanh xám ở vị trí tên, không bịa tên.
    }
  }
}

/** Tải danh sách bình luận thật của bài. */
async function loadComments() {
  try {
    // Staff thấy cả bình luận đang ẩn và đã xoá (để hiện lại hoặc khôi phục); người thường chỉ thấy bình luận đang hiện.
    state.comments = await (isStaff(state.viewer) ? listCommentsForStaff(state.post.id) : listComments(state.post.id)) || [];
    renderComments();
    await loadCommentAuthors();
  } catch (error) {
    qs('[data-comments]').replaceChildren(el('p', { className: 'post-comments__note' },
      'Chưa tải được bình luận: ' + toVietnameseMessage(error)));
  }
}

/** Bật nút Gửi khi ô nhập có chữ, và xoá gợi ý lỗi cũ khi người dùng gõ lại. */
function syncCommentForm() {
  const input = qs('[data-comment-input]');
  qs('[data-comment-submit]').disabled = !input.value.trim();
  input.removeAttribute('aria-invalid');
  const hint = qs('[data-comment-hint]');
  hint.textContent = '';
  hint.classList.remove('field__hint--error');
}

/** Gửi bình luận: kiểm tra phiên, gọi API, thêm bình luận mới vào danh sách khi thành công. */
async function submitComment(event) {
  event.preventDefault();
  const input = qs('[data-comment-input]');
  const button = qs('[data-comment-submit]');
  const hint = qs('[data-comment-hint]');
  const content = input.value.trim();
  if (!content || !await ensureSignedIn()) {
    return;
  }
  state.viewer = getCachedUser();
  button.disabled = true;
  button.classList.add('is-loading');
  button.textContent = 'Đang gửi…';
  try {
    const comment = await createComment(state.post.id, content, null, { postAuthorId: state.post.author_id });
    state.comments.push(comment);
    if (state.viewer && !state.commentAuthors.has(state.viewer.id)) {
      state.commentAuthors.set(state.viewer.id, { id: state.viewer.id, username: state.viewer.username, avatar_url: state.viewer.avatarUrl });
    }
    input.value = '';
    renderComments();
  } catch (error) {
    input.setAttribute('aria-invalid', 'true');
    hint.textContent = toVietnameseMessage(error);
    hint.classList.add('field__hint--error');
  } finally {
    button.classList.remove('is-loading');
    button.textContent = 'Gửi';
    button.disabled = !input.value.trim();
  }
}

/** Khoá bình luận hoặc người xem đang bị cấm viết thì ẩn ô viết và nói rõ lý do. */
function applyCommentPermissions() {
  const form = qs('[data-comment-form]');
  const notice = qs('[data-comment-notice]');
  const locked = state.post.comments_locked;
  const muted = isMutedNow(state.viewer?.mutedUntil);
  // Nhãn "Đã khoá bình luận" cạnh tiêu đề Thảo luận (mọi người thấy).
  qs('[data-locked-badge]').replaceChildren(locked ? createStatusBadge('locked') : '');
  notice.hidden = !locked && !muted;
  if (locked) {
    // Khoá bình luận: thay ô nhập bằng thông báo xám có ổ khoá.
    notice.className = 'post-notice post-notice--locked';
    notice.replaceChildren(modIcon('lock', 16), el('span', {}, 'Bình luận đã bị khoá cho bài viết này.'));
  } else if (muted) {
    // Bị tắt tiếng: thông báo vàng, ô nhập vẫn hiện nhưng bị khoá như Figma.
    notice.className = 'post-notice post-notice--muted';
    notice.replaceChildren(modIcon('mute', 16), el('span', {}, 'Bạn đang bị tắt tiếng đến ' + formatUntil(state.viewer.mutedUntil) + ' nên chưa thể bình luận.'));
  }
  form.hidden = locked;
  form.classList.toggle('is-disabled', muted);
  qs('[data-comment-input]').disabled = muted;
  qs('[data-comment-submit]').disabled = muted || !qs('[data-comment-input]').value.trim();
  // Người bị tắt tiếng cũng không thả cảm xúc được (mọi thao tác ghi bị chặn).
  if (state.viewer) {
    qs('[data-like]').disabled = muted;
  }
}

/* ===== Sidebar ===== */

/** Thẻ "Về tác giả": tên, cờ, giới thiệu, số bài và người theo dõi thật, nút theo dõi. */
function renderSideAuthor() {
  const { author, viewer } = state;
  const body = qs('[data-side-author]');
  if (!author) {
    body.replaceChildren(el('p', { className: 'post-side-card__note' }, 'Chưa tải được thông tin tác giả.'));
    return;
  }
  const stats = el('dl', { className: 'post-side-author__stats' },
    el('div', { className: 'post-side-author__stat' }, el('dt', {}, 'Bài viết'), el('dd', { 'data-stat-posts': '' }, state.postCount ?? '–')),
    el('div', { className: 'post-side-author__stat' }, el('dt', {}, 'Người theo dõi'), el('dd', { 'data-stat-followers': '' }, state.followerCount ?? '–')));
  let action;
  if (viewer && viewer.id === author.id) {
    // Bài của chính mình: thay nút theo dõi bằng lối tắt tới hồ sơ.
    action = el('a', { className: 'btn btn--secondary btn--block post-side-author__action', href: routes.profile }, 'Chỉnh sửa hồ sơ');
  } else {
    action = el('button', {
      type: 'button',
      className: 'btn btn--block post-side-author__action ' + (state.following ? 'btn--secondary' : 'btn--primary'),
      'aria-pressed': String(state.following),
      'data-follow': '',
    }, state.following ? 'Đang theo dõi' : '+  Theo dõi');
    action.addEventListener('click', toggleFollow);
  }
  body.replaceChildren(
    el('p', { className: 'post-side-author__name' }, wrapJapanese(author.username), createFlag(author.native, true)),
    author.bio
      ? el('p', { className: 'post-side-author__bio' }, wrapJapanese(author.bio))
      : el('p', { className: 'post-side-author__bio post-side-author__bio--empty' }, 'Tác giả chưa viết giới thiệu.'),
    el('hr', { className: 'post-divider' }),
    stats,
    el('hr', { className: 'post-divider' }),
    action);
}

/** Bấm theo dõi/bỏ theo dõi tác giả; số người theo dõi chỉ đổi khi API thành công. */
async function toggleFollow(event) {
  // Lấy nút trước lệnh await: sau khi sự kiện kết thúc, event.currentTarget trở thành null.
  const button = event.currentTarget;
  if (!await ensureSignedIn()) {
    return;
  }
  button.disabled = true;
  try {
    if (state.following) {
      await unfollowUser(state.author.id);
      state.followerCount = Math.max(0, (state.followerCount ?? 1) - 1);
    } else {
      await followUser(state.author.id);
      state.followerCount = (state.followerCount ?? 0) + 1;
    }
    state.following = !state.following;
    renderSideAuthor();
    qs('[data-follow]')?.focus();
  } catch (error) {
    button.disabled = false;
    showActionStatus(toVietnameseMessage(error), true);
  }
}

/** Thẻ "Địa điểm văn hoá": chỉ hiện khi bài có toạ độ; tên, địa chỉ, giờ mở cửa chờ backend. */
function renderPlace() {
  const { post } = state;
  const card = qs('[data-side-place-card]');
  const hasLocation = Number.isFinite(post.latitude) && Number.isFinite(post.longitude);
  card.hidden = !hasLocation;
  if (!hasLocation) {
    return;
  }
  const coords = post.latitude.toFixed(4) + ', ' + post.longitude.toFixed(4);
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(post.latitude + ',' + post.longitude);
  const place = getPostPlace(post);
  const info = el('div', { className: 'post-place' });
  if (place) {
    info.append(el('p', { className: 'post-place__name' }, wrapJapanese(place.name || '')),
      el('p', { className: 'post-place__line' }, wrapJapanese(place.address || '–')),
      el('p', { className: 'post-place__line post-place__line--small' },
        [place.opening_hours, place.phone].filter(Boolean).join(' · ') || '–'));
  } else {
    info.append(placeholder('u-placeholder-bar--title'), placeholder(), placeholder('u-placeholder-bar--short'));
  }
  qs('[data-side-place]').replaceChildren(
    el('div', { className: 'post-map' },
      el('img', { className: 'post-map__image', src: '/assets/illustrations/culture-map.svg', alt: '', width: 355, height: 182 }),
      el('a', { className: 'post-map__open', href: mapsUrl, target: '_blank', rel: 'noopener' },
        'Mở trong Maps', el('img', { src: '/assets/icons/external-link.svg', alt: '', width: 14, height: 14 })),
      el('span', { className: 'post-map__label' }, coords)),
    info,
    el('a', { className: 'post-place__link', href: mapsUrl, target: '_blank', rel: 'noopener' }, 'Xem trên Google Maps  ↗'));
}

/** Một dòng bài liên quan: ô kanji theo tag, tiêu đề hai dòng và dòng phụ số bình luận · chủ đề. */
function createRelatedItem(item) {
  const thumb = el('span', {
    className: 'post-related__thumb' + (item ? '' : ' post-related__thumb--placeholder'),
    'aria-hidden': 'true',
    lang: 'ja',
  }, TAG_KANJI[item?.tag?.name] || '越');
  const text = el('div', { className: 'post-related__text' });
  if (item) {
    text.append(el('a', { className: 'post-related__title', href: routes.post(item.id) }, wrapJapanese(item.title)),
      el('p', { className: 'post-related__meta' },
        (Number.isFinite(item.comment_count) ? item.comment_count : '–') + ' bình luận',
        item.tag ? wrapJapanese(' · ' + item.tag.name) : null));
  } else {
    text.append(placeholder('u-placeholder-bar--title'), placeholder('u-placeholder-bar--short'));
  }
  return el('div', { className: 'post-related__item' }, thumb, text);
}

/** Thẻ "Bài viết liên quan": bài thật cùng chủ đề; không có bài nào thì báo rõ. */
async function loadRelated() {
  const box = qs('[data-side-related]');
  box.replaceChildren(createRelatedItem(null), createRelatedItem(null), createRelatedItem(null));
  try {
    const items = await getRelatedPosts(state.post, state.tags);
    box.replaceChildren(...(items.length ? items.map(createRelatedItem)
      : [el('p', { className: 'post-side-card__note' }, 'Chưa có bài viết cùng chủ đề.')]));
  } catch {
    box.replaceChildren(el('p', { className: 'post-side-card__note' }, 'Chưa tải được bài viết liên quan.'));
  }
}

/** Thẻ "Chủ đề liên quan": tag thật của bài, mỗi tag mở trang tìm kiếm với tag đó. */
function renderTopics() {
  const box = qs('[data-side-topics]');
  if (!state.tags.length) {
    box.replaceChildren(el('p', { className: 'post-side-card__note' }, 'Bài viết chưa gắn chủ đề.'));
    return;
  }
  box.replaceChildren(...state.tags.map(tag => el('a', {
    className: 'post-topic',
    href: searchUrl({ tags: [tag.name] }),
  }, wrapJapanese('#' + tag.name))));
}

/* ===== Khởi tạo ===== */

/** Bài không tồn tại hoặc thiếu id: thay khung bài bằng thông báo và lối quay về Diễn đàn. */
function showNotFound(message) {
  const article = qs('[data-article]');
  article.setAttribute('aria-busy', 'false');
  article.replaceChildren(
    el('h1', { className: 't-display post-article__title' }, 'Không tìm thấy bài viết'),
    el('p', { className: 'post-body__empty' }, message),
    el('a', { className: 'btn btn--primary', href: routes.forum }, 'Về Diễn đàn'));
  qs('[data-breadcrumb-title]').textContent = 'Không tìm thấy';
  document.title = 'Không tìm thấy bài viết · Etsubi';
  qs('.post-sidebar').hidden = true;
}

/** Tải các phần cần đăng nhập: cảm xúc của mình, trạng thái lưu và theo dõi. */
async function loadViewerState() {
  if (!state.viewer) {
    return;
  }
  try {
    state.myEmoji = (await getMyReaction(state.post.id))?.emoji || null;
    renderLike();
    state.bookmarked = await isPostBookmarked(state.post.id);
    renderBookmark();
    if (state.author && state.author.id !== state.viewer.id) {
      state.following = await isFollowing(state.author.id);
      renderSideAuthor();
    }
  } catch {
    // Lỗi đọc trạng thái phụ không chặn việc đọc bài; nút vẫn hoạt động khi bấm.
  }
}

/** Tải số bài và số người theo dõi thật của tác giả cho thẻ "Về tác giả". */
async function loadAuthorStats() {
  if (!state.author) {
    return;
  }
  try {
    state.postCount = (await listUserPosts(state.author.id) || []).length;
    state.followerCount = (await listFollowers(state.author.id) || []).length;
  } catch {
    // Không lấy được thì giữ "–", không đoán số.
  }
  renderSideAuthor();
}

/** Trình tự tải trang: bài → tác giả, tag → nội dung → trạng thái người xem → thảo luận → sidebar. */
async function initialize() {
  mountPetals();
  if (!postId) {
    showNotFound('Đường dẫn thiếu mã bài viết.');
    return;
  }
  try {
    state.post = await getPost(postId);
  } catch (error) {
    // Bài bị ẩn hoặc đã xoá: staff đọc qua /manage nếu backend đã hỗ trợ (CẦN BACKEND, xem services/api/manage.js).
    const viewer = error.status === 404 ? await fetchCurrentUser().catch(() => null) : null;
    const staffPost = isStaff(viewer) ? await getPostForStaff(postId).catch(() => null) : null;
    if (staffPost) {
      state.post = staffPost;
      state.deletedAt = staffPost.deleted_at || null;
    } else {
      showNotFound(error.status === 404 || error.status === 400
        ? 'Bài viết có thể đã bị xoá, bị ẩn hoặc đường dẫn không đúng.' : toVietnameseMessage(error));
      return;
    }
  }
  const { post } = state;
  document.title = post.title + ' · Etsubi';
  qs('[data-breadcrumb-title]').replaceChildren(wrapJapanese(post.title));
  qs('[data-article]').setAttribute('aria-busy', 'false');
  renderContent();
  renderPlace();
  applyCommentPermissions();
  // Bật các nút sau khi đã có bài để không gửi thao tác cho bài chưa xác định.
  for (const selector of ['[data-translate]', '[data-like]', '[data-bookmark]', '[data-share]']) {
    qs(selector).disabled = false;
  }

  // Phiên người xem được tải song song với tác giả; hàng đợi trong client.js giữ đúng giới hạn tốc độ.
  const [viewer, author, tags, summary] = await Promise.all([
    fetchCurrentUser().catch(() => null),
    getUser(post.author_id).catch(() => null),
    getPostTags(post.id).catch(() => []),
    getReactionSummary(post.id).catch(() => null),
  ]);
  state.viewer = viewer;
  state.author = author;
  state.tags = tags || [];
  state.likeCount = Array.isArray(summary) ? summary.reduce((total, item) => total + (Number(item.count) || 0), 0) : null;
  renderAuthorRow();
  renderPostModeration();
  renderLike();
  renderBookmark();
  renderSideAuthor();
  renderTopics();
  applyCommentPermissions();

  // Từ Trang chủ có thể mở thẳng bản dịch bằng tham số translate=1.
  if (new URLSearchParams(location.search).get('translate') === '1' && viewer) {
    toggleTranslation();
  }
  await loadViewerState();
  await loadComments();
  await loadAuthorStats();
  await loadRelated();
}

// Gắn sự kiện một lần cho các điều khiển tĩnh trong HTML.
qs('[data-translate]').addEventListener('click', toggleTranslation);
qs('[data-like]').addEventListener('click', toggleLike);
qs('[data-bookmark]').addEventListener('click', toggleBookmark);
qs('[data-share]').addEventListener('click', sharePost);
qs('[data-comment-sort]').addEventListener('change', renderComments);
qs('[data-comment-input]').addEventListener('input', syncCommentForm);
qs('[data-comment-form]').addEventListener('submit', submitComment);

initialize().catch(error => showPageError(toVietnameseMessage(error)));
