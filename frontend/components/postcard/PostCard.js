/** Thẻ kết quả có liên kết phủ thẻ, còn liên kết tag vẫn thao tác độc lập được. */
import { statLabel } from '/utils/stat-label.js';
import { renderRichContent } from '/utils/rich-text.js';
import { markMentions } from '/utils/mention.js';
import { el } from '/utils/dom.js';
import { routes, searchUrl } from '/utils/routes.js';
import { initials, relativeTime } from '/utils/format.js';
import { highlight, wrapJapanese, makeExcerpt } from '/utils/text.js';
import { createTagChip } from '/components/tag-chip/tag-chip.js';
import { backendSupports } from '/services/api/capabilities.js';
import { getAuthorLabel, getAuthorHandle, getAuthorDisplayName } from '/services/api/posts.js';
import { t } from '/utils/i18n.js';

/** Tạo văn bản có đánh dấu khớp và gắn ngôn ngữ Nhật cho cả chữ trong mark. */
function markedText(text, query, variant) {
  const fragment = highlight(text, query);
  for (const mark of fragment.querySelectorAll('mark')) {
    mark.classList.add('hl--' + variant);
  }
  return wrapJapanese(fragment);
}

/**
 * Tạo bài viết từ dữ liệu hiện có; không tải thêm tác giả hoặc thống kê trong component.
 * @param {object} post Bài viết trả về từ API.
 * @param {object} options Từ khoá, tác giả, tag và hàm tạo liên kết tag tuỳ trang.
 * @returns {HTMLElement} Article có hook dữ liệu để bổ sung tác giả và tag tại chỗ.
 */
export function createPostCard(post, { query = '', author, tags = [], onTagHref } = {}) {
  const article = el('article', { className: 'postcard postcard--result', 'data-post-id': post.id });
  const authorRow = el('div', { className: 'postcard__author', 'data-post-author': '' });
  if (author) {
    const name = getAuthorLabel(author) || '–';
    const avatar = el('span', { className: 'postcard__avatar', 'aria-hidden': 'true' }, initials(getAuthorDisplayName(author)));
    if (author.avatar_url) {
      const image = el('img', { src: author.avatar_url, alt: name, width: 24, height: 24, loading: 'lazy' });
      /** Trả về chữ viết tắt khi ảnh lỗi để không hiển thị biểu tượng ảnh hỏng. */
      function useInitials() {
        avatar.replaceChildren(initials(getAuthorDisplayName(author)));
      }
      image.addEventListener('error', useInitials, { once: true });
      avatar.removeAttribute('aria-hidden');
      avatar.replaceChildren(image);
    }
    authorRow.append(avatar, el('span', { className: 'postcard__author-name' }, wrapJapanese(name)),
      el('span', { className: 'postcard__time' }, getAuthorHandle(author)));
  } else {
    authorRow.append(el('span', {
      className: 'postcard__author-placeholder', 'aria-label': t('Đang tải tác giả'),
    }));
  }
  const relative = relativeTime(post.created_at);
  if (relative) {
    authorRow.append(el('span', { 'aria-hidden': 'true' }, '·'),
      el('time', { datetime: post.created_at, className: 'postcard__time' }, relative));
  }
  const title = el('h2', { className: 'postcard__title' },
    el('a', { className: 'postcard__link', href: routes.post(post.id) }, markedText(post.title, query, 'title'))
  );
  const excerpt = markMentions(el('p', { className: 'postcard__excerpt' }, markedText(makeExcerpt(post.content, query), query, 'body')));
  const tagList = el('div', { className: 'postcard__tags', 'data-post-tags': '' });
  for (const tag of tags) {
    const name = typeof tag === 'string' ? tag : tag.name;
    if (name) {
      tagList.append(createTagChip({ name, href: onTagHref ? onTagHref(name) : searchUrl({ tags: [name] }) }));
    }
  }
  const stats = el('div', { className: 'postcard__stats', 'data-post-stats': '' });
  // Luôn giữ đủ 3 ô số như Figma (bình luận, lượt thích, lượt xem) theo quy tắc "front end đi trước".
  // Số bình luận do trang tải bổ sung qua getPostStats. CẦN BACKEND: GET /posts chưa trả like_count, view_count;
  // khi thiếu thì hiện "–", tuyệt đối không tạo số giả. Khi backend bổ sung trường, các ô tự hiện số thật.
  const numbers = [
    ['message-circle', post.comment_count, 'comments'],
    ['heart', post.like_count ?? post.reaction_count, 'likes'],
    ['eye-muted', post.view_count, 'views'],
  ];
  for (const [icon, count, label] of numbers) {
    const known = typeof count === 'number' && Number.isFinite(count);
    stats.append(el('span', {
      className: 'postcard__stat stat-tooltip' + (known ? '' : ' postcard__stat--unknown'),
      tabindex: '0', 'aria-label': statLabel(count, label),
    },
    el('img', { src: '/assets/icons/' + icon + '.svg', alt: '', width: 16, height: 16 }),
    label === 'views' ? t('{count} lượt xem', { count: known ? count : '–' }) : (known ? String(count) : '–')));
  }
  if (post.comments_locked) {
    const lock = el('span', { className: 'postcard__stat postcard__lock' });
    // SVG cố định dùng currentColor để cùng màu chữ, không nhận dữ liệu HTML từ API.
    lock.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    lock.append(t('Đã khoá bình luận'));
    stats.append(lock);
  }
  article.append(authorRow, title, excerpt, el('div', { className: 'postcard__footer' }, tagList, stats));
  return article;
}

// Chỉ một menu bảng tin mở cùng lúc; dùng một bộ lắng nghe chung thay vì một bộ cho mỗi thẻ.
let openFeedMenu = null;
let openFeedButton = null;
let feedMenuCount = 0;
let feedMenuEventsMounted = false;

/** Đóng menu đang mở và tuỳ chọn trả focus, kể cả khi thẻ cũ vừa bị thay khi đổi tab. */
function closeFeedMenu(restoreFocus = false) {
  if (openFeedMenu) {
    openFeedMenu.hidden = true;
    openFeedButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus && openFeedButton.isConnected) {
      openFeedButton.focus();
    }
    openFeedMenu = null;
    openFeedButton = null;
  }
}

/** Đóng menu khi nhấn ngoài vùng điều khiển hoặc Escape để bàn phím không bị mắc trong menu. */
function handleFeedDocumentEvent(event) {
  if (event.type === 'keydown' && event.key === 'Escape') {
    closeFeedMenu(true);
  } else if (event.type === 'click' && openFeedMenu
    && !openFeedMenu.contains(event.target) && !openFeedButton.contains(event.target)) {
    closeFeedMenu();
  }
}

/** Tạo icon hình vuông đúng cỡ 18px, dùng alt rỗng vì bên cạnh có nhãn hoặc số. */
function feedIcon(name, size = 18) {
  return el('img', { src: '/assets/icons/' + name + '.svg', alt: '', width: size, height: size });
}

/** Dựng avatar 44px bằng dữ liệu tác giả thật hoặc hình giữ chỗ trung tính. */
function createFeedAvatar(author) {
  const name = getAuthorLabel(author);
  const avatar = el('span', { className: 'avatar postcard-feed__avatar' }, initials(getAuthorDisplayName(author)));
  if (!author) {
    avatar.classList.add('postcard-feed__avatar--placeholder');
  }
  if (author?.avatar_url) {
    const image = el('img', { src: author.avatar_url, alt: name || '', width: 44, height: 44, loading: 'lazy' });
    /** Dùng chữ đầu của tác giả thật khi ảnh không tải được. */
    function useInitials() {
      avatar.replaceChildren(initials(getAuthorDisplayName(author)));
    }
    image.addEventListener('error', useInitials, { once: true });
    avatar.replaceChildren(image);
  }
  return avatar;
}

/** Hiện số thật hoặc dấu gạch trung tính kèm nhãn truy cập cho từng chỉ số còn thiếu. */
function createFeedStat(iconName, count, label) {
  const available = Number.isFinite(count);
  return el('span', {
    className: 'postcard-feed__stat stat-tooltip', tabindex: '0',
    'aria-label': statLabel(count, label),
  }, feedIcon(iconName), available ? count : '–');
}

/** Nút chia sẻ link bài viết: mở bảng chia sẻ của thiết bị, không có thì sao chép link; không đếm lượt. */
function createFeedShare(post) {
  const label = el('span', {}, t('Chia sẻ'));
  const feedback = el('span', { className: 'u-visually-hidden', role: 'status' });
  const button = el('button', { type: 'button', className: 'postcard-feed__share', 'aria-label': t('Chia sẻ bài viết') });
  // SVG tĩnh dùng currentColor để icon đổi màu cùng chữ khi hover, không nhận dữ liệu từ API.
  button.innerHTML = '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="13.5" cy="4.12" r="1.87"/><circle cx="4.5" cy="9" r="1.87"/><circle cx="13.5" cy="13.88" r="1.87"/><path d="m6.12 9.95 5.76 2.98M11.88 5.07 6.12 8.05"/></svg>';
  button.append(label);
  let sharing = false;
  /** Báo kết quả trong 1,5 giây; timer chỉ đổi chữ, không tạo hoạt ảnh. */
  function showResult(text, message) {
    label.textContent = text;
    feedback.textContent = message;
    setTimeout(() => { label.textContent = t('Chia sẻ'); }, 1500);
  }
  /** Chia sẻ đường dẫn tuyệt đối; người dùng tự đóng bảng chia sẻ thì không báo lỗi. */
  async function shareLink() {
    if (sharing) {
      return;
    }
    sharing = true;
    const url = new URL(routes.post(post.id), location.origin).href;
    try {
      if (navigator.share) {
        await navigator.share({ title: makeExcerpt(post.title, '', 120), url });
      } else {
        await navigator.clipboard.writeText(url);
        showResult(t('Đã sao chép'), t('Đã sao chép liên kết bài viết'));
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        showResult(t('Không thể sao chép'), t('Không thể sao chép. Bạn có thể mở chi tiết để lấy liên kết.'));
      }
    } finally {
      sharing = false;
    }
  }
  button.addEventListener('click', shareLink);
  return el('span', { className: 'postcard-feed__share-box' }, button, feedback);
}

/** Dựng menu nhỏ gồm sao chép liên kết và chi tiết; không chèn dữ liệu API bằng innerHTML. */
function createFeedMore(postId) {
  const menuId = 'feed-options-' + (++feedMenuCount);
  const button = el('button', {
    type: 'button', className: 'postcard-feed__icon-button', 'aria-label': t('Tuỳ chọn bài viết'),
    'aria-expanded': 'false', 'aria-controls': menuId,
  }, '···');
  const copy = el('button', { type: 'button', className: 'postcard-feed__menu-action' }, t('Sao chép liên kết'));
  const feedback = el('span', { className: 'u-visually-hidden', role: 'status' });
  const menu = el('div', { id: menuId, className: 'postcard-feed__menu', hidden: true }, copy,
    el('a', { className: 'postcard-feed__menu-action', href: routes.post(postId) }, t('Xem chi tiết')));
  /** Đóng menu cũ rồi đưa focus vào lựa chọn đầu để sử dụng được bằng bàn phím. */
  function toggleMenu() {
    const shouldOpen = menu.hidden;
    closeFeedMenu();
    if (shouldOpen) {
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      openFeedMenu = menu;
      openFeedButton = button;
      copy.focus();
    }
  }
  /** Sao chép URL tuyệt đối, báo kết quả trong 1,5 giây; timer chỉ đổi chữ, không tạo hoạt ảnh. */
  async function copyLink() {
    copy.disabled = true;
    try {
      await navigator.clipboard.writeText(new URL(routes.post(postId), location.origin).href);
      copy.textContent = t('Đã sao chép');
      feedback.textContent = t('Đã sao chép liên kết');
    } catch {
      copy.textContent = t('Không thể sao chép');
      feedback.textContent = t('Không thể sao chép. Bạn có thể mở chi tiết để lấy liên kết.');
    }
    /** Trả nhãn nút về trạng thái sẵn sàng sau thông báo ngắn. */
    function resetCopy() {
      copy.textContent = t('Sao chép liên kết');
      copy.disabled = false;
    }
    setTimeout(resetCopy, 1500);
  }
  button.addEventListener('click', toggleMenu);
  copy.addEventListener('click', copyLink);
  return el('div', { className: 'postcard-feed__more' }, button, menu, feedback);
}

/** Tạo ghi chú ngôn ngữ; chỉ nhận đã dịch khi cả cờ năng lực và dữ liệu xác nhận. */
function createTranslationNote(post, viewerLanguage) {
  const source = post.original_language || post.language;
  const translated = backendSupports.autoTranslateFeed && post.is_translated === true;
  if (!source || (source === viewerLanguage && !translated)) {
    return null;
  }
  // Tên ngôn ngữ giữ nguyên ở mọi giao diện. i18n-ignore
  const languageNames = { vi: 'Tiếng Việt', en: 'English', ja: '日本語' };
  const language = languageNames[source] || source;
  const note = el('p', { className: 'postcard-feed__translation' }, feedIcon('globe', 14),
    el('span', {}, wrapJapanese(translated ? t('Đã dịch tự động từ {language}', { language }) : t('Viết bằng {language}', { language })), ' · ',
      el('a', { href: routes.post(post.id) + (translated ? '&original=1' : '&translate=1') },
        translated ? t('Xem bản gốc') : t('Dịch'))));
  return note;
}

/** Tạo nút bookmark theo trạng thái thật; mixed nghĩa chưa có dữ liệu trạng thái ban đầu từ backend. */
function createBookmarkButton(postId, initialState, onBookmark) {
  let saved = typeof initialState === 'boolean' ? initialState : null;
  const button = el('button', {
    type: 'button', className: 'postcard-feed__icon-button postcard-feed__bookmark',
    'aria-label': saved === true ? t('Bỏ lưu bài') : t('Lưu bài'),
    'aria-pressed': saved === null ? 'mixed' : String(saved),
    title: saved === null ? t('Chưa có dữ liệu trạng thái lưu bài') : null,
  });
  // SVG Lucide tĩnh dùng currentColor; CSS đổi đỏ và tô lòng khi đã lưu thành công.
  button.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  /** Để trang xử lý phiên và API, chỉ đổi trạng thái khi lời gọi thành công. */
  async function toggleBookmark() {
    if (!onBookmark || button.disabled) {
      return;
    }
    button.disabled = true;
    try {
      const nextState = await onBookmark(postId, saved);
      if (typeof nextState === 'boolean') {
        saved = nextState;
        button.setAttribute('aria-pressed', String(saved));
        button.setAttribute('aria-label', saved ? t('Bỏ lưu bài') : t('Lưu bài'));
        button.removeAttribute('title');
      }
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener('click', toggleBookmark);
  return button;
}

/**
 * Dựng biến thể bảng tin riêng của Home; giữ nguyên createPostCard và mọi lớp của Search.
 * @param {object} post Bài có nội dung thật từ API.
 * @param {object} options Tác giả, tag, thống kê, ngôn ngữ người xem và thao tác lưu.
 * @returns {HTMLElement} Article có menu, dịch, tương tác và chi tiết truy cập được.
 */
export function createFeedPostCard(post, {
  author, tags = [], stats = {}, viewerLanguage = 'vi', bookmarked = null, onBookmark,
} = {}) {
  // Chỉ gắn bộ lắng nghe khi có thẻ feed, để trang Search không nhận thêm xử lý menu Home.
  if (!feedMenuEventsMounted) {
    document.addEventListener('click', handleFeedDocumentEvent);
    document.addEventListener('keydown', handleFeedDocumentEvent);
    feedMenuEventsMounted = true;
  }
  const identity = el('div', { className: 'postcard-feed__identity' });
  const name = getAuthorLabel(author);
  if (name) {
    identity.append(el('span', { className: 'postcard-feed__name' }, wrapJapanese(name)));
  } else {
    identity.append(el('span', { className: 'u-placeholder-bar', 'aria-label': t('Chưa có tên tác giả') }));
  }
  const sub = el('p', { className: 'postcard-feed__sub' });
  if (author?.username) {
    sub.append(wrapJapanese(getAuthorHandle(author)), ' · ');
  }
  sub.append(el('time', { datetime: post.created_at }, relativeTime(post.created_at)));
  identity.append(sub);
  const userRow = el('div', { className: 'postcard-feed__user' }, createFeedAvatar(author), identity, createFeedMore(post.id));
  const content = markMentions(el('p', { className: 'postcard-feed__content' }, wrapJapanese(makeExcerpt(post.content, '', 260))));
  // Hashtag dùng liên kết an toàn và tên thật; chữ Nhật được gắn lang cho phông chính xác.
  for (const tag of tags) {
    content.append(' ', el('a', { href: searchUrl({ tags: [tag.name] }) }, wrapJapanese('#' + tag.name)));
  }
  const engagement = el('div', { className: 'postcard-feed__engagement' },
    createFeedStat('comment', stats?.comment_count, 'comments'),
    createFeedStat('upvote', stats?.like_count, 'likes'),
    createFeedShare(post),
    el('a', { href: routes.post(post.id), className: 'btn btn--primary featured-card__detail postcard-feed__detail' },
      t('Xem chi tiết'), feedIcon('arrow-right')),
    createBookmarkButton(post.id, bookmarked, onBookmark));
  // Ảnh HTTPS lấy từ nội dung đã lọc, giữ thứ tự dọc; không tạo dải thumbnail hoặc dữ liệu ảnh riêng.
  const richBody = el('div');
  renderRichContent(richBody, post.content);
  const images = el('div', { className: 'postcard-feed__images' }, [...richBody.querySelectorAll('img')]);
  return el('article', { className: 'postcard postcard--feed', 'data-post-id': post.id },
    userRow, createTranslationNote(post, viewerLanguage), content, images, engagement);
}
