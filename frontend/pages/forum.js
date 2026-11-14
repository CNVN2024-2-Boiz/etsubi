/** Trang Diễn đàn (Figma 1:1587): ô viết bài, bốn tab bảng tin và danh sách PostCard dùng chung với Trang chủ. */
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { createFeedPostCard } from '/components/postcard/PostCard.js';
import { createTagChip } from '/components/tag-chip/tag-chip.js';
import { listPosts, listFollowingFeed, listQuestionPosts, getPostTags, getPostStats, createPost, uploadAttachment, supportsPolls } from '/services/api/posts.js';
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

// Tab Mới nhất tải từng trang 10 bài; các endpoint riêng chưa hỗ trợ phân trang nên hiện toàn bộ lần trả về.
const PAGE_SIZE = 10;
const feedList = qs('[data-feed-list]');
const feedStatus = qs('[data-feed-status]');
const errorBox = qs('[data-forum-error]');
const moreBox = qs('[data-feed-more]');
const moreButton = qs('[data-feed-more-button]');
const compose = qs('[data-compose]');
const bookmarkStates = new Map();
let user = getCachedUser();
let tags = [];
let selectedTags = new Set();
let selectedFeed = 'newest';
let feedVersion = 0;
let feedOffset = 0;
let feedController = null;

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
    // Không giả trang tiếp theo cho endpoint chưa nhận offset, tránh tải lặp danh sách 20 bài.
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
  // Các tab dùng endpoint riêng hiện chỉ có một danh sách, chưa thể yêu cầu trang kế tiếp.
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

/** Hiện thông báo dưới ô viết bài; kind là '', 'error' hoặc 'success'. */
function setComposeStatus(content, kind = '') {
  const status = qs('[data-compose-status]');
  status.classList.toggle('is-error', kind === 'error');
  status.classList.toggle('is-success', kind === 'success');
  status.replaceChildren(...[].concat(content));
}

/** Avatar và lời mời theo người đang đăng nhập (Figma: "Mạnh Phú ơi, bạn đang nghĩ gì?"). */
function renderComposeIdentity() {
  const avatar = qs('[data-compose-avatar]');
  const content = qs('[data-compose-content]');
  // Chưa đăng nhập: ô chỉ đọc, bấm vào sẽ dẫn tới trang đăng nhập.
  content.readOnly = !user;
  if (!user) {
    avatar.className = 'forum-compose__avatar forum-compose__avatar--placeholder';
    avatar.replaceChildren();
    content.placeholder = 'Đăng nhập để chia sẻ…';
    return;
  }
  avatar.className = 'forum-compose__avatar';
  avatar.replaceChildren(initials(user.username));
  if (user.avatarUrl) {
    const image = el('img', { src: user.avatarUrl, alt: '' });
    /** Ảnh lỗi thì quay về chữ đầu tên. */
    function useInitials() {
      avatar.replaceChildren(initials(user.username));
    }
    image.addEventListener('error', useInitials, { once: true });
    avatar.replaceChildren(image);
  }
  content.placeholder = user.username + ' ơi, bạn đang nghĩ gì?';
}

/** Dựng các chip chủ đề có thể bật/tắt từ danh sách tag thật. */
function renderComposeTags() {
  const box = qs('[data-compose-tags]');
  if (!tags.length) {
    box.replaceChildren(el('p', { className: 'field__hint' }, 'Chưa tải được danh sách chủ đề.'));
    return;
  }
  box.replaceChildren(...tags.map(tag => createTagChip({
    name: tag.name,
    state: selectedTags.has(tag.id) ? 'selected' : 'default',
    onClick: () => {
      // Bấm chip thì đổi trạng thái chọn rồi vẽ lại, giữ focus trên đúng chip vừa bấm.
      if (selectedTags.has(tag.id)) {
        selectedTags.delete(tag.id);
      } else {
        selectedTags.add(tag.id);
      }
      renderComposeTags();
      qs('[data-tag-name="' + CSS.escape(tag.name) + '"]', box)?.focus();
    },
  })));
}

/** Nút Đăng chỉ bật khi đã có cả tiêu đề và nội dung (backend bắt buộc tiêu đề). */
function syncComposeSubmit() {
  const title = qs('[data-compose-title]').value.trim();
  const content = qs('[data-compose-content]').value.trim();
  qs('[data-compose-submit]').disabled = !title || !content;
}

/** Chưa đăng nhập mà bấm vào ô viết: sang trang đăng nhập, xong quay lại với ô viết mở sẵn (?compose=1). */
function goToLogin() {
  location.assign(withRedirect(routes.login, routes.newPost));
}

/** Ô nội dung nhận focus: mở rộng ô viết (chỉ khi đã đăng nhập, để phím Tab không gây chuyển trang). */
function openCompose() {
  if (!user || compose.classList.contains('is-open')) {
    return;
  }
  compose.classList.add('is-open');
  qs('[data-compose-extra]').hidden = false;
  qs('[data-compose-cancel]').hidden = false;
  renderComposeTags();
}

/** Thu gọn và xoá bản nháp (nút Huỷ hoặc sau khi đăng thành công). */
function resetCompose() {
  compose.reset();
  selectedTags = new Set();
  compose.classList.remove('is-open');
  qs('[data-compose-extra]').hidden = true;
  qs('[data-compose-cancel]').hidden = true;
  qs('[data-compose-title]').removeAttribute('aria-invalid');
  syncComposeSubmit();
}

/** Ảnh, Tệp, Thăm dò: backend chưa có API nên chỉ báo rõ, không gửi yêu cầu. */
async function handleComposeTool(event) {
  const tool = event.target.closest('[data-compose-tool]')?.dataset.composeTool;
  if (!tool) {
    return;
  }
  const messages = {
    image: 'Đính kèm ảnh sẽ có khi máy chủ hỗ trợ tải tệp lên.',
    file: 'Đính kèm tệp sẽ có khi máy chủ hỗ trợ tải tệp lên.',
    poll: 'Tạo thăm dò sẽ có khi máy chủ hỗ trợ.',
  };
  const supported = tool === 'poll' ? supportsPolls() : backendSupports.postAttachments;
  if (!supported) {
    setComposeStatus(messages[tool]);
    return;
  }
  // Khi backend hỗ trợ: mở hộp chọn tệp và tải lên (thăm dò sẽ có biểu mẫu riêng).
  if (tool !== 'poll') {
    const picker = el('input', { type: 'file', accept: tool === 'image' ? 'image/*' : null });
    picker.addEventListener('change', async () => {
      if (picker.files?.[0]) {
        await uploadAttachment(picker.files[0]);
      }
    }, { once: true });
    picker.click();
  }
}

/** Đăng bài: tạo bài, gắn từng tag đã chọn, thu gọn ô viết và tải lại tab Mới nhất. */
async function submitCompose(event) {
  event.preventDefault();
  const titleInput = qs('[data-compose-title]');
  const title = titleInput.value.trim();
  const content = qs('[data-compose-content]').value.trim();
  if (!title || !content || !await requireAuth()) {
    return;
  }
  const button = qs('[data-compose-submit]');
  button.disabled = true;
  button.classList.add('is-loading');
  button.textContent = 'Đang đăng…';
  setComposeStatus('Đang đăng bài…');
  try {
    // Service gắn từng tag rồi báo người theo dõi, trang chỉ hiển thị kết quả và lỗi tag nếu có.
    const post = await createPost({ title, content }, { tagIds: [...selectedTags] });
    const failedTags = post.failedTagIds.length;
    resetCompose();
    setComposeStatus(['Đã đăng bài viết. ', el('a', { href: routes.post(post.id) }, 'Xem bài'),
      failedTags ? ' (' + failedTags + ' chủ đề chưa gắn được.)' : ''], 'success');
    // Bài mới nằm ở tab Mới nhất nên chuyển về tab đó để người viết thấy ngay.
    activateTab(qs('[data-feed-tab="newest"]'));
  } catch (error) {
    titleInput.setAttribute('aria-invalid', /title/i.test(error.message || '') ? 'true' : 'false');
    setComposeStatus(toVietnameseMessage(error), 'error');
  } finally {
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
  if (new URLSearchParams(location.search).get('compose') === '1') {
    if (user) {
      // Mở trực tiếp vì sự kiện focus không chạy khi cửa sổ trình duyệt chưa được chọn.
      openCompose();
      qs('[data-compose-content]').focus();
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
  }
}

// Gắn sự kiện một lần cho các điều khiển tĩnh trong HTML.
qs('[data-feed-tabs]').addEventListener('click', handleTabClick);
qs('[data-feed-tabs]').addEventListener('keydown', handleTabKey);
moreButton.addEventListener('click', loadMore);
qs('[data-compose-content]').addEventListener('focus', openCompose);
qs('[data-compose-content]').addEventListener('input', syncComposeSubmit);
qs('[data-compose-title]').addEventListener('input', syncComposeSubmit);

/** Bấm hoặc nhấn Enter vào ô viết khi chưa đăng nhập thì dẫn tới trang đăng nhập. */
function handleSignedOutCompose(event) {
  if (!user && (event.type === 'click' || event.key === 'Enter')) {
    event.preventDefault();
    goToLogin();
  }
}
qs('[data-compose-content]').addEventListener('click', handleSignedOutCompose);
qs('[data-compose-content]').addEventListener('keydown', handleSignedOutCompose);

/** Nút Huỷ: thu gọn ô viết, xoá bản nháp và thông báo cũ. */
function cancelCompose() {
  resetCompose();
  setComposeStatus('');
}
qs('[data-compose-cancel]').addEventListener('click', cancelCompose);
compose.addEventListener('click', handleComposeTool);
compose.addEventListener('submit', submitCompose);
window.addEventListener('pagehide', leavePage);
void initialize();
