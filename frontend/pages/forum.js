/** Trang Diễn đàn (Figma 1:1587): ô viết bài, bốn tab bảng tin và danh sách PostCard dùng chung với Trang chủ. */
import { getAuthorLabel } from '/services/api/posts.js';
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { createFeedPostCard } from '/components/postcard/PostCard.js';
import { createTagChip } from '/components/tag-chip/tag-chip.js';
import { createRichEditor } from '/components/rich-editor/rich-editor.js';
import { createPlaceChip, createImagePreviews } from '/components/rich-editor/media-preview.js';
import { pickPlace } from '/components/place-picker/place-picker.js';
import { validateRichBytes } from '/utils/rich-text.js';
import { listPosts, listFollowingFeed, listQuestionPosts, getPostTags, getPostStats, createPost } from '/services/api/posts.js';
import { backendSupports } from '/services/api/capabilities.js';
import { getReactionSummary } from '/services/api/reactions.js';
import { bookmarkPost, unbookmarkPost, getBookmarkState } from '/services/api/bookmarks.js';
import { getUser } from '/services/api/users.js';
import { listTags } from '/services/api/tags.js';
import { readStorage } from '/services/api/client.js';
import { fetchCurrentUser, getCachedUser, requireAuth } from '/utils/auth.js';
import { el, qs, qsa } from '/utils/dom.js';
import { initials } from '/utils/format.js';
import { toVietnameseMessage } from '/utils/errors.js';
import { routes, withRedirect } from '/utils/routes.js';

// Header có tab Diễn đàn đang chọn và ô tìm kiếm trong suốt như Figma; footer đầy đủ.
mountHeader(qs('[data-component="header"]'), { active: 'forum', searchForm: true });
mountFooter();

// Tab Mới nhất tải từng trang 10 bài; các endpoint riêng phục vụ Diễn đàn không phân trang, hiện backend tạm cắt 3 bài.
const PAGE_SIZE = 10;
const feedList = qs('[data-feed-list]');
const feedStatus = qs('[data-feed-status]');
const errorBox = qs('[data-forum-error]');
const moreBox = qs('[data-feed-more]');
const moreButton = qs('[data-feed-more-button]');
const compose = qs('[data-compose]');
// Giữ một form duy nhất và neo gốc để bản nháp, ID cùng các listener không bị nhân đôi trong dialog.
const composeSlot = qs('[data-compose-slot]');
const composeFab = qs('[data-compose-fab]');
const composeDialog = qs('[data-compose-dialog]');
let composeObserver = null;
let composeMuted = false;
let composeAboveViewport = false;
const bookmarkStates = new Map();
let user = getCachedUser();
let tags = [];
let selectedTags = new Set();
let selectedFeed = 'newest';
let feedVersion = 0;
let feedOffset = 0;
let feedController = null;

// Editor và media thuộc cùng một form, vì vậy chuyển vào dialog không làm mất nháp.
let composePlace = null;
let composeSending = false;
const composeEditor = createRichEditor({ label: 'Nội dung bài viết', onChange: () => {
  // Người viết đã sửa nội dung, bỏ dấu lỗi cũ nhưng vẫn tính lại trạng thái nút Đăng.
  composeEditor.area.removeAttribute('aria-invalid');
  syncComposeSubmit();
} });
composeEditor.area.setAttribute('aria-describedby', 'compose-hint');
qs('[data-compose-editor]').append(composeEditor.root);
// CẦN BACKEND: ảnh chỉ xem trước; hợp đồng POST /uploads + attachments nằm trong posts.js.
const composeImages = createImagePreviews(qs('[data-compose-images]'), {
  onChange: () => { qs('[data-compose-image-note]').hidden = !composeImages.hasImages(); },
  onError: message => setComposeStatus(message, 'error'),
});

/* ===== Tiện ích ===== */

/** Báo lỗi tiếng Việt trong vùng alert chung, không dùng alert() của trình duyệt. */
function showError(error) {
  errorBox.textContent = toVietnameseMessage(error);
  errorBox.hidden = false;
}

/** Thanh chờ tĩnh, không giả dữ liệu, không hoạt ảnh. */
function placeholder(short = false) {
  return el('span', { className: 'u-placeholder-bar' + (short ? ' u-placeholder-bar--short' : ''), 'aria-hidden': 'true' });
}

/** Ngôn ngữ người xem: hồ sơ đăng nhập, rồi lựa chọn ở header, mặc định tiếng Việt. */
function viewerLanguage() {
  return getCachedUser()?.language || readStorage('etsubi_lang') || 'vi';
}

/** Mười cánh hoa tĩnh hai bên lề; vị trí nằm trong token CSS, kích thước nằm trong file SVG. */
function mountPetals() {
  const files = [1, 3, 5, 1, 3, 11, 2, 6, 4, 12];
  const layer = qs('[data-petals]');
  files.forEach((file, index) => {
    layer.append(el('img', {
      className: 'forum-petal forum-petal--' + (index + 1),
      src: '/assets/illustrations/sakura-' + file + '.svg',
      alt: '',
    }));
  });
}

/* ===== Bảng tin ===== */

/** Thẻ chờ tải giữ chiều cao bảng tin, không spinner hay shimmer. */
function createFeedPlaceholder() {
  return el('div', { className: 'postcard postcard--feed forum-feed__placeholder', 'aria-hidden': 'true' },
    el('div', { className: 'postcard-feed__user' },
      el('span', { className: 'avatar postcard-feed__avatar postcard-feed__avatar--placeholder' }),
      el('div', { className: 'postcard-feed__identity' }, placeholder(true), placeholder(true))),
    placeholder(), placeholder(), placeholder(true));
}

/** Liên kết đăng nhập quay lại đúng trang Diễn đàn. */
function loginLink() {
  return el('a', { className: 'btn btn--secondary btn--sm', href: withRedirect(routes.login, location.pathname + location.search) }, 'Đăng nhập');
}

/** Thay bảng tin bằng một thông báo (rỗng, chưa hỗ trợ, cần đăng nhập). */
function showFeedInfo(message, needsLogin = false) {
  feedList.replaceChildren(el('div', { className: 'forum-feed__info' }, el('p', {}, message), needsLogin ? loginLink() : null));
  feedList.setAttribute('aria-busy', 'false');
  feedStatus.textContent = message;
  moreBox.hidden = true;
}

/** Lưu hoặc bỏ lưu thật; nhớ trạng thái để thẻ dựng lại không quay về trạng thái cũ. */
async function handleBookmark(postId, saved) {
  errorBox.hidden = true;
  try {
    if (!await requireAuth()) {
      return null;
    }
    if (saved === true) {
      await unbookmarkPost(postId);
    } else {
      await bookmarkPost(postId);
    }
    bookmarkStates.set(postId, saved !== true);
    return saved !== true;
  } catch (error) {
    showError(error);
    return null;
  }
}

/** Dựng thẻ PostCard dùng chung (component của Trang chủ) từ dữ liệu đã có. */
function feedCard(post, author, postTags = [], stats = null, bookmarked = null) {
  return createFeedPostCard(post, {
    author,
    tags: postTags,
    stats,
    viewerLanguage: viewerLanguage(),
    bookmarked: bookmarkStates.has(post.id) ? bookmarkStates.get(post.id) : bookmarked,
    onBookmark: handleBookmark,
  });
}

/** Bổ sung tác giả, tag và số lượt thích cho từng bài lần lượt (tôn trọng giới hạn 4 yêu cầu/giây). */
async function enrichFeed(posts, version) {
  for (const post of posts) {
    if (version !== feedVersion) {
      return;
    }
    let author = post.author;
    let postTags = post.tags || [];
    let stats = await getPostStats(post.id, post);
    const bookmarked = await getBookmarkState(post);
    try {
      author = await getUser(post.author_id);
      postTags = await getPostTags(post.id);
      const summary = await getReactionSummary(post.id);
      if (Array.isArray(summary)) {
        const count = summary.reduce((total, reaction) => total + (Number(reaction.count) || 0), 0);
        stats = { ...stats, like_count: count };
      }
    } catch (error) {
      // Lỗi của danh sách cũ không hiện lên danh sách người dùng vừa chọn.
      if (version === feedVersion) {
        showError(error);
      }
    }
    if (version !== feedVersion) {
      return;
    }
    const target = Array.from(feedList.children).find(card => card.dataset.postId === String(post.id));
    // Không thay thẻ đang giữ focus, chờ focus rời đi rồi mới cập nhật để không mất vị trí bàn phím.
    if (target?.contains(document.activeElement)) {
      /** Cập nhật thẻ khi focus đã rời khỏi thẻ. */
      function updateAfterFocusLeaves(event) {
        if (!target.contains(event.relatedTarget)) {
          target.removeEventListener('focusout', updateAfterFocusLeaves);
          if (version === feedVersion && target.isConnected) {
            target.replaceWith(feedCard(post, author, postTags, stats, bookmarked));
          }
        }
      }
      target.addEventListener('focusout', updateAfterFocusLeaves);
    } else {
      target?.replaceWith(feedCard(post, author, postTags, stats, bookmarked));
    }
  }
}

/** Lấy bài theo endpoint của từng tab; chỉ tab Mới nhất gửi tham số phân trang. */
async function fetchPage(offset, signal) {
  if (selectedFeed === 'following') {
    return listFollowingFeed({ signal });
  }
  // Hỏi đáp dùng endpoint mới thay cho việc tải danh mục và tìm mã tag question.
  if (selectedFeed === 'question') {
    return listQuestionPosts({ signal });
  }
  return listPosts({
    limit: PAGE_SIZE,
    offset,
    sort: selectedFeed === 'popular' ? 'popular' : 'newest',
    lang: backendSupports.autoTranslateFeed ? viewerLanguage() : undefined,
    signal,
  });
}

/** Tải lại bảng tin từ đầu; khách xem tab theo dõi vẫn nhận lời mời đăng nhập. */
async function loadFeed() {
  const version = ++feedVersion;
  feedController?.abort();
  feedController = new AbortController();
  const { signal } = feedController;
  feedOffset = 0;
  moreBox.hidden = true;
  feedList.setAttribute('aria-busy', 'true');
  feedStatus.textContent = 'Đang tải bài viết…';
  feedList.replaceChildren(createFeedPlaceholder(), createFeedPlaceholder(), createFeedPlaceholder());
  try {
    // Không gọi endpoint cần JWT nếu chưa có hồ sơ đăng nhập.
    if (selectedFeed === 'following' && !user) {
      showFeedInfo('Đăng nhập để xem bài từ những người bạn theo dõi.', true);
      return;
    }
    const posts = await fetchPage(0, signal);
    if (version !== feedVersion) {
      return;
    }
    // Service trả null nghĩa là máy chủ chưa hỗ trợ bảng tin này: báo trung tính, không hiện lỗi.
    if (posts === null) {
      showFeedInfo('Bảng tin theo dõi sẽ có khi máy chủ hỗ trợ.');
      return;
    }
    if (!posts?.length) {
      showFeedInfo(selectedFeed === 'following' ? 'Bạn chưa theo dõi ai hoặc họ chưa đăng bài.'
        : selectedFeed === 'question' ? 'Chưa có bài hỏi đáp nào.' : 'Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!');
      return;
    }
    feedOffset = posts.length;
    feedList.replaceChildren(...posts.map(post => feedCard(post, post.author, post.tags)));
    feedList.setAttribute('aria-busy', 'false');
    feedStatus.textContent = 'Đã tải ' + posts.length + ' bài viết.';
    // Endpoint riêng trả toàn bộ danh sách cho Diễn đàn; chỉ tab Mới nhất có nút tải thêm.
    moreBox.hidden = selectedFeed !== 'newest' || posts.length < PAGE_SIZE;
    await enrichFeed(posts, version);
  } catch (error) {
    if (version !== feedVersion || signal.aborted) {
      return;
    }
    const retry = el('button', { type: 'button', className: 'btn btn--secondary btn--sm' }, 'Thử lại');
    retry.addEventListener('click', loadFeed);
    feedList.replaceChildren(el('div', { className: 'alert alert--error forum-feed__info', role: 'alert' },
      el('p', {}, toVietnameseMessage(error)), retry));
    feedStatus.textContent = 'Không tải được bài viết.';
    feedList.setAttribute('aria-busy', 'false');
  }
}

/** Nút "Tải thêm bài viết": nối trang tiếp theo vào cuối danh sách. */
async function loadMore() {
  // Các tab dùng endpoint riêng không phân trang nên không yêu cầu trang kế tiếp.
  if (selectedFeed !== 'newest') {
    return;
  }
  const version = feedVersion;
  moreButton.disabled = true;
  moreButton.textContent = 'Đang tải…';
  try {
    const posts = await fetchPage(feedOffset, feedController?.signal);
    if (version !== feedVersion) {
      return;
    }
    const fresh = (posts || []).filter(post => !feedList.querySelector('[data-post-id="' + CSS.escape(String(post.id)) + '"]'));
    feedOffset += posts?.length || 0;
    feedList.append(...fresh.map(post => feedCard(post, post.author, post.tags)));
    feedStatus.textContent = 'Đã tải thêm ' + fresh.length + ' bài viết.';
    moreBox.hidden = !posts || posts.length < PAGE_SIZE;
    await enrichFeed(fresh, version);
  } catch (error) {
    showError(error);
  } finally {
    moreButton.disabled = false;
    moreButton.textContent = 'Tải thêm bài viết';
  }
}

/** Chọn tab, cập nhật ARIA (roving tabindex) rồi tải lại bảng tin. */
function activateTab(tab) {
  selectedFeed = tab.dataset.feedTab;
  for (const candidate of qsa('[data-feed-tab]')) {
    const active = candidate === tab;
    candidate.classList.toggle('is-active', active);
    candidate.setAttribute('aria-selected', String(active));
    candidate.tabIndex = active ? 0 : -1;
  }
  feedList.setAttribute('aria-labelledby', tab.id);
  void loadFeed();
}

/** Bấm một tab khác tab hiện tại thì kích hoạt nó. */
function handleTabClick(event) {
  const tab = event.target.closest('[data-feed-tab]');
  if (tab && tab.dataset.feedTab !== selectedFeed) {
    activateTab(tab);
  }
}

/** Mũi tên trái/phải, Home, End chuyển tab theo mẫu bàn phím của tablist. */
function handleTabKey(event) {
  const tab = event.target.closest('[data-feed-tab]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return;
  }
  event.preventDefault();
  const allTabs = qsa('[data-feed-tab]');
  const current = allTabs.indexOf(tab);
  let next = event.key === 'ArrowLeft' ? (current + allTabs.length - 1) % allTabs.length : (current + 1) % allTabs.length;
  if (event.key === 'Home') {
    next = 0;
  } else if (event.key === 'End') {
    next = allTabs.length - 1;
  }
  allTabs[next].focus();
  activateTab(allTabs[next]);
}

/* ===== Ô viết bài ===== */

/** Chỉ đổi hidden, không hiệu ứng; nút nổi không cạnh tranh với ô gốc, dialog hoặc trạng thái tạm khoá viết. */
function syncComposeFab() {
  composeFab.hidden = !composeAboveViewport || composeDialog.open || composeMuted;
}

/** Quan sát neo gốc với mép trên trừ header sticky để phân biệt khuất phía trên với chưa tới ở phía dưới. */
function observeComposeSlot() {
  const header = qs('[data-component="header"]');
  const headerPosition = getComputedStyle(header).position;
  const headerHeight = ['sticky', 'fixed'].includes(headerPosition) ? header.getBoundingClientRect().height : 0;
  composeObserver?.disconnect();
  composeAboveViewport = composeSlot.getBoundingClientRect().bottom < headerHeight;
  syncComposeFab();
  // Dùng rootBounds thay vì số đo cũ để kiểm tra đúng mép nhìn thấy trong callback của observer.
  composeObserver = new IntersectionObserver(([entry]) => {
    composeAboveViewport = !entry.isIntersecting && entry.boundingClientRect.bottom < (entry.rootBounds?.top ?? headerHeight);
    syncComposeFab();
  }, { rootMargin: '-' + headerHeight + 'px 0px 0px 0px', threshold: 0 });
  composeObserver.observe(composeSlot);
}

/** Di chuyển form thật để giữ bản nháp và công cụ; giữ chiều cao neo để bảng tin không nhảy khi mở dialog. */
function openComposeDialog() {
  if (composeMuted || composeDialog.open) {
    return;
  }
  if (!user) {
    goToLogin();
    return;
  }
  composeSlot.style.setProperty('--compose-slot-height', composeSlot.getBoundingClientRect().height + 'px');
  composeSlot.classList.add('is-holding');
  compose.classList.add('is-in-dialog');
  composeDialog.append(compose);
  // showModal ghi nhớ nút mở trước khi hidden để việc mở không kéo trang tới form gốc.
  composeDialog.showModal();
  syncComposeFab();
  openCompose();
  composeEditor.focus();
}

/** Đóng bằng nút, Huỷ hoặc sau khi đăng; Escape cũng đi qua sự kiện close để trả cùng form về đúng neo. */
function closeComposeDialog() {
  if (composeDialog.open) {
    composeDialog.close();
  }
  // Trả form ngay, không chờ sự kiện close (có trình duyệt phát trễ khi tab không vẽ); close vẫn là dự phòng.
  restoreCompose();
}

/** Trả form về chỗ cũ, giữ bản nháp khi đóng bằng Escape/Đóng và trả focus mà không cuộn tới đầu trang. */
function restoreCompose() {
  // Gọi được nhiều lần: nếu form đã nằm ở neo gốc thì không làm gì, tránh focus hai lần.
  if (compose.parentElement === composeSlot) {
    return;
  }
  composeSlot.append(compose);
  compose.classList.remove('is-in-dialog');
  composeSlot.classList.remove('is-holding');
  composeSlot.style.removeProperty('--compose-slot-height');
  observeComposeSlot();
  const focusTarget = composeFab.hidden ? qs('[data-feed-tab][aria-selected="true"]') : composeFab;
  focusTarget.focus({ preventScroll: true });
}

/** Hiện thông báo dưới ô viết bài; kind là '', 'error' hoặc 'success'. */
function setComposeStatus(content, kind = '') {
  const status = qs('[data-compose-status]');
  status.classList.toggle('is-error', kind === 'error');
  status.classList.toggle('is-success', kind === 'success');
  status.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  status.replaceChildren(...[].concat(content));
}

/** Avatar và lời mời theo người đang đăng nhập (Figma: "Mạnh Phú ơi, bạn đang nghĩ gì?"). */
function renderComposeIdentity() {
  const avatar = qs('[data-compose-avatar]');
  const title = qs('[data-compose-title]');
  title.readOnly = !user;
  if (!user) {
    avatar.className = 'forum-compose__avatar forum-compose__avatar--placeholder';
    avatar.replaceChildren();
  } else {
    avatar.className = 'forum-compose__avatar';
    avatar.replaceChildren(initials(user.displayname || user.username));
    if (user.avatarUrl) {
      const image = el('img', { src: user.avatarUrl, alt: getAuthorLabel(user) });
      // Ảnh hỏng quay về tên viết tắt thật, không để biểu tượng ảnh lỗi.
      image.addEventListener('error', () => avatar.replaceChildren(initials(user.displayname || user.username)), { once: true });
      avatar.replaceChildren(image);
    }
  }
  title.placeholder = compose.classList.contains('is-open') ? 'Tiêu đề bài viết'
    : user ? getAuthorLabel(user) + ' ơi, bạn đang nghĩ gì?' : 'Đăng nhập để chia sẻ…';
}

/** Dựng chip Chủ đề theo Figma 394:3090 / 397:3355 từ danh mục GET /tags, không hiện số bài. */
function renderComposeTags() {
  const box = qs('[data-compose-tags]');
  if (!tags.length) {
    box.replaceChildren(el('p', { className: 'field__hint' }, 'Chưa tải được danh sách chủ đề.'));
    return;
  }
  box.replaceChildren(...tags.map(tag => {
    // Nút thật hỗ trợ chuột, Space và Enter; aria-pressed diễn đạt từng lựa chọn độc lập.
    return createTagChip({
      name: tag.name,
      state: selectedTags.has(tag.id) ? 'selected' : 'default',
      onClick: event => {
        // Cập nhật ngay nút đang dùng để giữ focus bàn phím và mã tag gửi qua createPost.
        if (selectedTags.has(tag.id)) selectedTags.delete(tag.id);
        else selectedTags.add(tag.id);
        const selected = selectedTags.has(tag.id);
        const updated = createTagChip({ name: tag.name, state: selected ? 'selected' : 'default' });
        const button = event.currentTarget;
        button.className = updated.className;
        button.setAttribute('aria-pressed', String(selected));
        button.replaceChildren(...updated.childNodes);
      },
    });
  }));
}

/** Nút Đăng chỉ bật khi đã có cả tiêu đề và nội dung (backend bắt buộc tiêu đề). */
function syncComposeSubmit() {
  const title = qs('[data-compose-title]').value.trim();
  const content = composeEditor.getPlainText().trim();
  qs('[data-compose-submit]').disabled = composeSending || composeMuted || !title || !content;
}

/** Chưa đăng nhập mà bấm vào ô viết: sang trang đăng nhập, xong quay lại với ô viết mở sẵn (?compose=1). */
function goToLogin() {
  location.assign(withRedirect(routes.login, routes.newPost));
}

/** Ô nội dung nhận focus: mở rộng ô viết (chỉ khi đã đăng nhập, để phím Tab không gây chuyển trang). */
function openCompose() {
  if (!user || composeMuted || compose.classList.contains('is-open')) {
    return;
  }
  compose.classList.add('is-open');
  qs('[data-compose-extra]').hidden = false;
  qs('[data-compose-cancel]').hidden = false;
  renderComposeIdentity();
  renderComposeTags();
}

/** Thu gọn và xoá bản nháp (nút Huỷ hoặc sau khi đăng thành công). */
function resetCompose() {
  compose.reset();
  composeEditor.clear();
  composeImages.clear();
  composePlace = null;
  renderComposePlace();
  selectedTags = new Set();
  renderComposeTags();
  compose.classList.remove('is-open');
  qs('[data-compose-extra]').hidden = true;
  qs('[data-compose-cancel]').hidden = true;
  qs('[data-compose-title]').removeAttribute('aria-invalid');
  composeEditor.area.removeAttribute('aria-invalid');
  renderComposeIdentity();
  syncComposeSubmit();
}

/** Vẽ chip địa điểm và phản ánh trạng thái Bản đồ cho người dùng bàn phím. */
function renderComposePlace() {
  qs('[data-compose-place]').replaceChildren(...(composePlace ? [createPlaceChip(composePlace, () => {
    composePlace = null;
    renderComposePlace();
  })] : []));
  qs('[data-compose-tool="place"]').setAttribute('aria-pressed', String(Boolean(composePlace)));
}

/** Ảnh mở picker cục bộ; Bản đồ dùng dialog chung và giữ nháp khi Huỷ. */
async function handleComposeTool(event) {
  const tool = event.target.closest('[data-compose-tool]')?.dataset.composeTool;
  if (!tool || composeMuted || composeSending) return;
  if (!user) { goToLogin(); return; }
  openCompose();
  if (tool === 'image') composeImages.open();
  if (tool === 'place') {
    const place = await pickPlace(composePlace);
    if (place) { composePlace = place; renderComposePlace(); }
  }
}

/** Nháp hoàn toàn trống mới được tự thu gọn, không bỏ nội dung khi bấm bên ngoài. */
function collapseEmptyCompose(event) {
  if (composeDialog.open || document.querySelector('[data-place-picker]') || !compose.classList.contains('is-open')) return;
  if (event.type === 'keydown' && event.key !== 'Escape') return;
  if (event.type === 'pointerdown' && compose.contains(event.target)) return;
  if (!qs('[data-compose-title]').value.trim() && composeEditor.isEmpty() && !composeImages.hasImages() && !composePlace && !selectedTags.size) resetCompose();
}

/** Đăng bài: tạo bài, gắn từng tag đã chọn, thu gọn ô viết và tải lại tab Mới nhất. */
async function submitCompose(event) {
  event.preventDefault();
  const titleInput = qs('[data-compose-title]');
  const title = titleInput.value.trim();
  const content = composeEditor.getHtml();
  if (composeMuted || composeSending || !title || composeEditor.isEmpty() || !await requireAuth()) {
    return;
  }
  const titleError = validateRichBytes(title, 255, 'Tiêu đề');
  const validation = titleError || validateRichBytes(content, 100000);
  if (validation) {
    (titleError ? titleInput : composeEditor.area).setAttribute('aria-invalid', 'true');
    setComposeStatus(validation, 'error'); return;
  }
  const hadImages = composeImages.hasImages();
  composeSending = true;
  const button = qs('[data-compose-submit]');
  compose.inert = true;
  button.disabled = true;
  button.classList.add('is-loading');
  button.textContent = 'Đang đăng…';
  setComposeStatus('Đang đăng bài…');
  try {
    // Service gắn từng tag rồi báo người theo dõi, trang chỉ hiển thị kết quả và lỗi tag nếu có.
    const post = await createPost({ title, content, ...(composePlace ? { latitude: composePlace.latitude, longitude: composePlace.longitude } : {}) }, { tagIds: [...selectedTags] });
    const failedTags = post.failedTagIds.length;
    resetCompose();
    setComposeStatus([hadImages ? 'Đã đăng bài. Ảnh chưa được gửi vì máy chủ chưa hỗ trợ. ' : 'Đã đăng bài. ', el('a', { href: routes.post(post.id) }, 'Xem bài'),
      failedTags ? ' (' + failedTags + ' chủ đề chưa gắn được.)' : ''], 'success');
    // Chỉ thành công mới đóng dialog; khi lỗi, vùng trạng thái và bản nháp vẫn nằm trước người viết.
    closeComposeDialog();
    // Bài mới nằm ở tab Mới nhất nên chuyển về tab đó để người viết thấy ngay.
    activateTab(qs('[data-feed-tab="newest"]'));
  } catch (error) {
    titleInput.setAttribute('aria-invalid', /title/i.test(error.message || '') ? 'true' : 'false');
    if (!/title/i.test(error.message || '')) composeEditor.area.setAttribute('aria-invalid', 'true');
    setComposeStatus(toVietnameseMessage(error), 'error');
  } finally {
    composeSending = false;
    compose.inert = false;
    button.classList.remove('is-loading');
    button.textContent = 'Đăng';
    syncComposeSubmit();
  }
}

/** Tài khoản đang bị tạm khoá viết: báo thời hạn và khoá ô viết bài. */
function applyMute() {
  const until = user?.mutedUntil ? new Date(user.mutedUntil) : null;
  const muted = Boolean(until && until.getTime() > Date.now());
  const notice = qs('[data-mute-notice]');
  notice.hidden = !muted;
  notice.textContent = muted ? 'Tài khoản đang bị tạm khoá chức năng viết đến ' + until.toLocaleString('vi-VN') + '. Bạn vẫn có thể đọc bài viết.' : '';
  compose.classList.toggle('is-disabled', muted);
  compose.setAttribute('aria-disabled', String(muted));
  // Nút nổi cũng phải theo trạng thái khoá viết như form gốc, kể cả lúc form đang ở dialog.
  composeMuted = muted;
  qs('[data-compose-title]').disabled = muted;
  composeEditor.area.contentEditable = String(!muted);
  composeEditor.toolbar.inert = muted;
  syncComposeSubmit();
  syncComposeFab();
}

/* ===== Khởi tạo ===== */

/** Tải phiên, danh mục tag, rồi bảng tin; ?compose=1 (nút "Đăng bài" ở Trang chủ) mở sẵn ô viết. */
async function initialize() {
  mountPetals();
  user = await fetchCurrentUser();
  renderComposeIdentity();
  applyMute();
  try {
    tags = await listTags() || [];
  } catch (error) {
    showError(error);
  }
  // Danh mục tải xong phải cập nhật cả form đã được người dùng mở trong lúc chờ API.
  renderComposeTags();
  if (new URLSearchParams(location.search).get('compose') === '1') {
    if (user) {
      // Mở trực tiếp vì sự kiện focus không chạy khi cửa sổ trình duyệt chưa được chọn.
      openCompose();
      composeEditor.focus();
    } else {
      goToLogin();
      return;
    }
  }
  await loadFeed();
}

/** Rời trang thì dừng các yêu cầu bổ sung còn dở. */
function leavePage(event) {
  if (!event.persisted) {
    feedVersion += 1;
    feedController?.abort();
    // Ngừng quan sát khi rời hẳn trang; trang trong bộ nhớ quay lại vẫn giữ observer đang dùng.
    composeObserver?.disconnect();
    composeHeaderObserver.disconnect();
  }
}

// Gắn sự kiện một lần cho các điều khiển tĩnh trong HTML.
qs('[data-feed-tabs]').addEventListener('click', handleTabClick);
qs('[data-feed-tabs]').addEventListener('keydown', handleTabKey);
moreButton.addEventListener('click', loadMore);
// Figma 344:2714 / 344:2918: dialog dùng một form; cập nhật ngưỡng khi header đổi chiều cao ở mobile.
composeFab.addEventListener('click', openComposeDialog);
qs('[data-compose-dialog-close]').addEventListener('click', closeComposeDialog);
composeDialog.addEventListener('close', restoreCompose);
const composeHeaderObserver = new ResizeObserver(observeComposeSlot);
composeHeaderObserver.observe(qs('[data-component="header"]'));
observeComposeSlot();
qs('[data-compose-title]').addEventListener('focus', openCompose);
qs('[data-compose-title]').addEventListener('input', syncComposeSubmit);

/** Bấm hoặc nhấn Enter vào ô viết khi chưa đăng nhập thì dẫn tới trang đăng nhập. */
function handleSignedOutCompose(event) {
  if (!user && (event.type === 'click' || event.key === 'Enter')) {
    event.preventDefault();
    goToLogin();
  }
}
qs('[data-compose-title]').addEventListener('click', handleSignedOutCompose);
qs('[data-compose-title]').addEventListener('keydown', handleSignedOutCompose);

/** Nút Huỷ: thu gọn ô viết, xoá bản nháp và thông báo cũ; đóng dialog nếu đang viết từ nút nổi. */
function cancelCompose() {
  resetCompose();
  setComposeStatus('');
  closeComposeDialog();
}
qs('[data-compose-cancel]').addEventListener('click', cancelCompose);
compose.addEventListener('click', handleComposeTool);
compose.addEventListener('submit', submitCompose);
document.addEventListener('pointerdown', collapseEmptyCompose);
document.addEventListener('keydown', collapseEmptyCompose);
window.addEventListener('pagehide', leavePage);
void initialize();
