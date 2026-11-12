/** Điều phối tìm kiếm đã gửi, URL chia sẻ và tải bổ sung tuần tự qua các service dùng chung. */
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { createSearchBar } from '/components/search-bar/search-bar.js';
import { createTagChip } from '/components/tag-chip/tag-chip.js';
import { createPostCard } from '/components/postcard/PostCard.js';
import { searchPosts, getPostTags } from '/services/api/posts.js';
import { listTags, tagIdsFromNames } from '/services/api/tags.js';
import { getUser } from '/services/api/users.js';
import { requireAuth } from '/utils/auth.js';
import { routes, searchUrl } from '/utils/routes.js';
import { toVietnameseMessage } from '/utils/errors.js';
import { el, qs, qsa } from '/utils/dom.js';
import { wrapJapanese } from '/utils/text.js';

// Giữ riêng trạng thái đã gửi và dữ liệu đã tải; bản nháp chỉ nằm trong search-bar.
const PAGE_SIZE = 10;
const title = qs('[data-search-title]');
const description = qs('[data-search-description]');
const results = qs('[data-search-results]');
const status = qs('[data-search-status]');
const errorBox = qs('[data-search-error]');
const emptyCard = qs('[data-empty-card]');
const moreButton = qs('[data-load-more]');
const sortButton = qs('[data-sort-button]');
const sortOptions = qs('[data-sort-options]');
const counts = new Map();
const backgroundController = new AbortController();
let tags = [];
let tagsLoaded = false;
let catalogPromise = null;
let submitted = { q: '', tags: [] };
let posts = [];
let hasMore = false;
let sort = 'newest';
let controller = null;
let requestVersion = 0;
let loading = false;
let retryAppend = false;
let countJobStarted = false;
let enrichmentQueue = Promise.resolve();

// Dựng header ngay để trang có điều hướng trong lúc tải danh mục tag.
const searchBar = createSearchBar({ tags, onSubmit: submitSearch });
mountHeader(qs('[data-component="header"]'), { variant: 'search', active: null, searchSlot: searchBar.element });
mountFooter(qs('[data-component="footer"]'), { variant: 'full' });
const backButton = el('button', {
  type: 'button', className: 'search-back', 'aria-label': 'Quay lại',
});
// Mũi tên cố định theo Lucide, màu kế thừa từ header và không chứa HTML động.
backButton.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7M5 12h14"/></svg>';
qs('[data-component="header"]').prepend(backButton);

/** Đọc cả tag lặp và tag ngăn dấu phẩy, chuẩn hoá tên để URL viết hoa vẫn dùng đúng danh mục. */
function readUrl() {
  const params = new URLSearchParams(location.search);
  const names = params.getAll('tag').flatMap(splitTagNames);
  return { q: (params.get('q') || '').trim().slice(0, 200), tags: [...new Set(names)] };
}

/** Tách một tham số tag thành tên sạch, không giữ dấu thăng hoặc phần tử rỗng. */
function splitTagNames(value) {
  return value.split(',').map(normalizeTagName).filter(Boolean);
}

/** Chuẩn hoá tên thẻ trong URL, giữ dạng viết thường tương ứng bộ tag cố định của API. */
function normalizeTagName(value) {
  return value.trim().replace(/^#/u, '').toLocaleLowerCase('vi');
}

/** Chỉ chặn điều hướng trái chuột thông thường, giữ Ctrl/Cmd/Shift và mở tab mới của liên kết. */
function isPlainClick(event) {
  return event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
}

/** Đưa URL đã gửi vào history rồi chạy tìm kiếm; input đơn thuần không bao giờ gọi hàm này. */
function submitSearch(nextState) {
  submitted = { q: nextState.q.trim().slice(0, 200), tags: [...new Set(nextState.tags)] };
  history.pushState(null, '', searchUrl(submitted));
  searchBar.setState(submitted);
  sort = 'newest';
  updateSort();
  void runSearch();
}

/** Đổi một tag của bản nháp rồi gửi chủ động từ bộ lọc hoặc hàng tag trên mobile. */
function toggleFilter(event, name) {
  const draft = searchBar.getState({ validate: true });
  if (!draft) {
    return;
  }
  const nextTags = draft.tags.includes(name) ? draft.tags.filter(isOtherTag) : [...draft.tags, name];
  /** Giữ mọi tag ngoài tag vừa được người dùng nhấn để bật tắt. */
  function isOtherTag(tag) {
    return tag !== name;
  }
  submitSearch({ q: draft.q, tags: nextTags });
}

/** Thêm tag phổ biến vào bộ lọc hiện có thay vì xoá các điều kiện người dùng đã chọn. */
function addPopularTag(event, name) {
  if (!isPlainClick(event)) {
    return;
  }
  event.preventDefault();
  const draft = searchBar.getState({ validate: true });
  if (!draft) {
    return;
  }
  submitSearch({ q: draft.q, tags: [...new Set([...draft.tags, name])] });
}

/** Xoá tag đang lọc, giữ từ khoá đã gửi; nếu không còn điều kiện thì quay lại trạng thái trống. */
function clearTags() {
  submitSearch({ q: submitted.q, tags: [] });
}

/** Dựng chip ở desktop và mobile từ cùng trạng thái đã gửi để hai vùng luôn thể hiện giống nhau. */
function renderFilters() {
  const filterTags = qs('[data-filter-tags]');
  filterTags.replaceChildren(el('span', { className: 'search-filters__label' },
    el('img', { src: '/assets/icons/tag.svg', alt: '', width: 16, height: 16 }), 'Tag:'));
  const mobileTags = qs('[data-mobile-tags]');
  mobileTags.replaceChildren();
  // Tag lạ từ URL vẫn được hiện để người dùng gỡ được, không âm thầm mở rộng phạm vi tìm.
  const names = [...new Set([...tags.map(tagName), ...submitted.tags])];
  for (const name of names) {
    const options = {
      name,
      state: submitted.tags.includes(name) ? 'selected' : 'default',
      onClick: toggleFilter,
    };
    filterTags.append(createTagChip(options));
    mobileTags.append(createTagChip(options));
  }
}

/** Lấy tên danh mục cho phép map gọn mà vẫn có hàm được chú thích rõ. */
function tagName(tag) {
  return tag.name;
}

/** Hiện tag phổ biến theo số bài đã đo; không có số khi API đếm của tag đó thất bại. */
function renderPopularTags() {
  const target = qs('[data-popular-tags]');
  const ordered = [...tags].sort(compareTagCounts);
  target.replaceChildren();
  for (const tag of ordered) {
    const count = counts.get(tag.id);
    target.append(createTagChip({
      name: tag.name,
      count: count == null ? undefined : String(count) + (count === 50 ? '+' : ''),
      href: searchUrl({ tags: [tag.name] }),
      onClick: addPopularTag,
    }));
  }
  if (!tags.length) {
    target.append(el('p', { className: 'search-sidebar-card__note' }, 'Chưa tải được danh sách tag.'));
  }
}

/** Sắp theo số bài giảm dần, giữ thứ tự danh mục khi bằng nhau hoặc chưa biết số lượng. */
function compareTagCounts(first, second) {
  return (counts.get(second.id) ?? -1) - (counts.get(first.id) ?? -1);
}

/** Tải danh mục một lần và cho phép thử lại sau lỗi, dùng chung Promise để không gọi trùng. */
async function ensureTags() {
  if (tagsLoaded) {
    return;
  }
  if (!catalogPromise) {
    catalogPromise = listTags();
  }
  try {
    tags = await catalogPromise;
    tagsLoaded = true;
    searchBar.setTags(tags);
    renderFilters();
    renderPopularTags();
  } finally {
    catalogPromise = null;
  }
}

/** Cập nhật h1 với số đã tải, không giả định API trả tổng số; dấu cộng báo còn có thể tải trang tiếp. */
function renderHeading() {
  const active = Boolean(submitted.q || submitted.tags.length);
  qs('[data-sort-container]').hidden = !active;
  qs('[data-search-filters]').hidden = !active;
  qs('[data-search-heading]').classList.toggle('is-submitted', active);
  title.replaceChildren();
  description.replaceChildren();
  if (!active) {
    title.append('Tìm kiếm trên Etsubi');
    description.append('Nhập từ khoá hoặc #tag rồi nhấn Enter / bấm “Tìm kiếm”.');
    return;
  }
  const total = String(posts.length) + (hasMore ? '+' : '');
  if (loading && !posts.length) {
    title.append('Đang tìm kiếm…');
  } else if (submitted.q) {
    title.append(total + ' kết quả cho “', el('span', { className: 'search-heading__query' }, wrapJapanese(submitted.q)), '”');
  } else {
    title.append(total + ' bài viết có tag ',
      el('span', { className: 'search-heading__query' }, submitted.tags.map(prefixedTag).join(', ')));
  }
  if (submitted.tags.length) {
    description.append('Lọc theo ');
    for (let index = 0; index < submitted.tags.length; index += 1) {
      if (index) {
        description.append(' + ');
      }
      description.append(el('span', { className: 'search-heading__query' }, '#' + submitted.tags[index]));
    }
    description.append(' · khớp tất cả tag');
  }
}

/** Thêm dấu thăng khi mô tả danh sách tag trong h1. */
function prefixedTag(name) {
  return '#' + name;
}

/** Chọn nội dung thẻ trống ban đầu hoặc không có kết quả mà không cần sao chép bố cục. */
function showEmpty(noResults = false) {
  emptyCard.hidden = false;
  emptyCard.classList.toggle('search-empty--no-results', noResults);
  qs('[data-empty-title]').textContent = noResults ? 'Không tìm thấy bài viết phù hợp' : 'Bạn muốn tìm gì?';
  qs('[data-empty-description]').textContent = noResults
    ? 'Thử từ khoá khác, bỏ bớt tag, hoặc kiểm tra chính tả có dấu.'
    : 'Kết quả chỉ hiển thị sau khi bạn nhấn Enter hoặc bấm “Tìm kiếm”. Gõ # để thêm tag, hoặc dùng nút “Tag” để chọn từ danh sách.';
  qs('[data-search-shortcuts]').hidden = noResults;
  qs('[data-empty-clear]').hidden = !noResults || !submitted.tags.length;
  qs('[data-mobile-info]').hidden = noResults;
}

/** Tạo đúng ba thẻ giữ chỗ tĩnh; aria-busy và live region đã mô tả trạng thái tải. */
function renderSkeletons() {
  results.replaceChildren();
  for (let index = 0; index < 3; index += 1) {
    const card = el('div', { className: 'search-skeleton', 'aria-hidden': 'true' },
      el('span', { className: 'search-skeleton__bar search-skeleton__bar--short' }),
      el('span', { className: 'search-skeleton__bar' }),
      el('span', { className: 'search-skeleton__bar search-skeleton__bar--medium' }));
    results.append(card);
  }
}

/** Tạo href tag của bài viết; trang bắt sự kiện riêng để tìm tại chỗ mà vẫn mở tab mới được. */
function postTagHref(name) {
  return searchUrl({ tags: [name] });
}

/** Dựng bài mới theo thứ tự API và giữ article trong bản ghi để sắp xếp không làm mất dữ liệu bổ sung. */
function appendPost(post) {
  const card = createPostCard(post, { query: submitted.q, onTagHref: postTagHref });
  const entry = { post, card, author: undefined, tags: [] };
  posts.push(entry);
  results.append(card);
  return entry;
}

/** Bổ sung từng bài tuần tự; kết quả của lần tìm cũ không được phép sửa danh sách hiện tại. */
async function enrichPosts(entries, version) {
  for (const entry of entries) {
    if (version !== requestVersion) {
      return;
    }
    try {
      entry.author = await getUser(entry.post.author_id);
    } catch {
      // Tác giả lỗi không làm mất bài; tên dự phòng thay thanh chờ để không kẹt ở trạng thái tải.
      entry.author = { username: 'Thành viên' };
    }
    if (version !== requestVersion) {
      return;
    }
    updateEnrichment(entry, true);
    try {
      const postTags = await getPostTags(entry.post.id);
      // Hợp đồng trả đối tượng tag; chấp nhận UUID để không hiển thị mã kỹ thuật như tên tag.
      entry.tags = postTags.map(resolvePostTag).filter(Boolean);
    } catch {
      // Giữ bài và tác giả ngay cả khi endpoint tag tạm thời không phản hồi.
      entry.tags = [];
    }
    if (version !== requestVersion) {
      return;
    }
    updateEnrichment(entry, false);
  }
}

/** Đổi UUID trong phản hồi tag thành đối tượng danh mục, giữ đối tượng có tên sẵn từ API. */
function resolvePostTag(tag) {
  if (typeof tag === 'object' && tag?.name) {
    return tag;
  }
  /** Đối chiếu mã tag với danh mục đã tải để lấy tên công khai thay vì hiển thị UUID. */
  function matchesId(candidate) {
    return candidate.id === tag || candidate.id === tag?.tag_id;
  }
  return tags.find(matchesId);
}

/** Chỉ thay hàng tác giả hoặc nhóm tag, giữ nguyên liên kết tiêu đề và focus đang đọc bài. */
function updateEnrichment(entry, authorOnly) {
  const next = createPostCard(entry.post, { query: submitted.q, author: entry.author, tags: entry.tags, onTagHref: postTagHref });
  const hook = authorOnly ? '[data-post-author]' : '[data-post-tags]';
  qs(hook, entry.card).replaceWith(qs(hook, next));
}

/** Đảo thứ tự danh sách đã tải cho Cũ nhất, không diễn đạt là thứ tự toàn bộ dữ liệu của máy chủ. */
function orderPosts() {
  const ordered = sort === 'oldest' ? [...posts].reverse() : posts;
  for (const entry of ordered) {
    results.append(entry.card);
  }
}

/** Cập nhật nhãn, trạng thái nhấn và chú giải về giới hạn của sắp xếp cục bộ. */
function updateSort() {
  qs('[data-sort-label]').textContent = sort === 'newest' ? 'Mới nhất' : 'Cũ nhất';
  sortButton.title = 'Sắp xếp các bài viết đã tải';
  for (const option of qsa('[data-sort]')) {
    option.setAttribute('aria-pressed', String(option.dataset.sort === sort));
  }
}

/** Đồng bộ trạng thái chờ của danh sách và nút, dùng chữ tĩnh thay cho spinner. */
function setLoading(value) {
  loading = value;
  results.setAttribute('aria-busy', String(value));
  searchBar.setBusy(value);
  moreButton.disabled = value;
  moreButton.textContent = value ? 'Đang xử lý…' : 'Xem thêm kết quả';
}

/**
 * Tìm một trang bài qua service, huỷ lần tìm trước và chỉ chấp nhận kết quả đúng phiên hiện tại.
 * @param {boolean} append true khi tải thêm; false khi thay điều kiện hoặc khôi phục URL.
 * @returns {Promise<void>} Hoàn thành sau khi bài chính hiển thị, dữ liệu bổ sung tiếp tục tuần tự.
 */
async function runSearch(append = false) {
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  const version = append ? requestVersion : ++requestVersion;
  retryAppend = append;
  errorBox.hidden = true;
  emptyCard.hidden = true;
  qs('[data-mobile-info]').hidden = true;
  qs('[data-more-container]').hidden = true;
  if (!append) {
    posts = [];
    hasMore = false;
    results.replaceChildren();
  }
  renderFilters();
  if (!submitted.q && !submitted.tags.length) {
    setLoading(false);
    renderHeading();
    showEmpty();
    status.textContent = '';
    return;
  }
  setLoading(true);
  renderHeading();
  if (!append) {
    renderSkeletons();
  }
  status.textContent = 'Đang tìm…';
  try {
    await ensureTags();
    if (signal.aborted) {
      return;
    }
    // Không bỏ qua tag sai trong URL vì việc đó có thể trả bài ngoài ý định của người dùng.
    for (const name of submitted.tags) {
      /** Kiểm tra tên URL có thật trong danh mục, tránh bỏ qua bộ lọc lạ một cách âm thầm. */
      function hasName(tag) {
        return tag.name === name;
      }
      if (!tags.some(hasName)) {
        throw new Error('Không có tag #' + name);
      }
    }
    const tagIds = await tagIdsFromNames(submitted.tags);
    if (signal.aborted) {
      return;
    }
    const page = await searchPosts({ q: submitted.q, tagIds, limit: PAGE_SIZE, offset: posts.length, signal });
    if (version !== requestVersion || signal.aborted) {
      return;
    }
    if (!append) {
      results.replaceChildren();
    }
    hasMore = page.length === PAGE_SIZE;
    const newEntries = [];
    for (const post of page) {
      newEntries.push(appendPost(post));
    }
    orderPosts();
    setLoading(false);
    renderHeading();
    if (!posts.length) {
      showEmpty(true);
    }
    qs('[data-more-container]').hidden = !hasMore;
    status.textContent = 'Đã tải ' + posts.length + (hasMore ? ' kết quả. Có thể xem thêm kết quả.' : ' kết quả.');
    /** Xếp các trang bài vào cùng chuỗi bổ sung để tải thêm không bỏ dở tác giả của trang trước. */
    async function enrichThisPage() {
      await enrichPosts(newEntries, version);
    }
    enrichmentQueue = enrichmentQueue.then(enrichThisPage);
  } catch (error) {
    if (version !== requestVersion || signal.aborted || error.name === 'AbortError') {
      return;
    }
    if (!append) {
      results.replaceChildren();
    }
    setLoading(false);
    renderHeading();
    qs('[data-error-message]').textContent = toVietnameseMessage(error);
    errorBox.hidden = false;
    status.textContent = 'Không thể tải kết quả tìm kiếm.';
  }
}

/** Đếm từng tag tuần tự sau lần vẽ đầu, giới hạn 50 bài và không tạo hàng loạt yêu cầu song song. */
async function loadPopularCounts() {
  if (countJobStarted || !tagsLoaded) {
    return;
  }
  countJobStarted = true;
  for (const tag of tags) {
    if (backgroundController.signal.aborted) {
      return;
    }
    try {
      const matching = await searchPosts({ tagIds: [tag.id], limit: 50, signal: backgroundController.signal });
      counts.set(tag.id, matching.length);
    } catch {
      // Một tag đếm lỗi vẫn giữ chip không số; tiếp tục các tag còn lại theo thứ tự.
    }
    if (!backgroundController.signal.aborted) {
      renderPopularTags();
    }
  }
}

/** Khôi phục điều kiện đã chia sẻ từ URL khi tải trang hoặc nhấn Back/Forward của trình duyệt. */
function restoreUrl() {
  submitted = readUrl();
  searchBar.setState(submitted);
  sort = 'newest';
  updateSort();
  void runSearch();
}

/** Giữ tag trong bài là liên kết thực, chỉ tìm tại chỗ khi nhấn trái thông thường trên trang này. */
function handleResultTag(event) {
  const link = event.target.closest('a[data-tag-name]');
  if (!link || !isPlainClick(event)) {
    return;
  }
  event.preventDefault();
  submitSearch({ q: '', tags: [link.dataset.tagName] });
}

/** Bật tắt menu sắp xếp gọn, đưa focus vào lựa chọn đầu khi mở bằng bàn phím. */
function toggleSort() {
  const open = sortOptions.hidden;
  sortOptions.hidden = !open;
  sortButton.setAttribute('aria-expanded', String(open));
  if (open) {
    qs('[data-sort]', sortOptions).focus();
  }
}

/** Áp dụng lựa chọn chỉ trên bài đã tải rồi đóng menu, không gửi yêu cầu tìm kiếm khác. */
function chooseSort(event) {
  const option = event.target.closest('[data-sort]');
  if (!option) {
    return;
  }
  sort = option.dataset.sort;
  updateSort();
  orderPosts();
  closeSort(true);
}

/** Đóng menu sort, tuỳ chọn trả focus về nút đã mở để tiếp tục tab thuận tiện. */
function closeSort(restoreFocus = false) {
  if (sortOptions.hidden) {
    return;
  }
  sortOptions.hidden = true;
  sortButton.setAttribute('aria-expanded', 'false');
  if (restoreFocus) {
    sortButton.focus();
  }
}

/** Đóng menu khi nhấn ngoài hoặc Escape, tránh giữ bảng nổi sau khi đã rời thao tác. */
function handleDocumentEvent(event) {
  if (event.type === 'keydown' && event.key === 'Escape') {
    closeSort(true);
  } else if (event.type === 'click' && !qs('[data-sort-container]').contains(event.target)) {
    closeSort();
  }
}

/** Đi tới trang soạn bài sau khi kiểm tra phiên, dùng nhãn tĩnh khi đang kiểm tra. */
async function writePost(event) {
  if (!isPlainClick(event)) {
    return;
  }
  event.preventDefault();
  const link = event.currentTarget;
  if (link.getAttribute('aria-disabled') === 'true') {
    return;
  }
  link.setAttribute('aria-disabled', 'true');
  link.textContent = 'Đang xử lý…';
  try {
    if (await requireAuth()) {
      location.assign(routes.newPost);
    }
  } finally {
    link.removeAttribute('aria-disabled');
    link.replaceChildren(el('img', { src: '/assets/icons/plus.svg', alt: '', width: 16, height: 16 }), 'Viết bài');
  }
}

/** Quay về lịch sử nếu có, hoặc trang chủ khi mở trực tiếp trang tìm kiếm trên điện thoại. */
function goBack() {
  if (history.length > 1) {
    history.back();
  } else {
    location.assign(routes.home);
  }
}

/** Tải thêm trang theo offset hiện có; chặn nhấn lặp trong khi yêu cầu đang xử lý. */
function loadMore() {
  if (!loading && hasMore) {
    void runSearch(true);
  }
}

/** Thử lại đúng thao tác vừa lỗi, kể cả lỗi tải thêm để không xoá những bài đã có. */
async function retrySearch() {
  if (loading) {
    return;
  }
  if (submitted.q || submitted.tags.length) {
    await runSearch(retryAppend);
  } else {
    await initialize();
  }
  void loadPopularCounts();
}

/** Dừng tìm cũ và đếm nền khi rời trang; không ngắt trang lưu trong bộ nhớ Back/Forward. */
function leavePage(event) {
  if (!event.persisted) {
    controller?.abort();
    backgroundController.abort();
  }
}

/** Tải danh mục và khôi phục URL; nếu danh mục lỗi vẫn cho gõ và có nút thử lại rõ ràng. */
async function initialize() {
  searchBar.setBusy(true);
  submitted = readUrl();
  searchBar.setState(submitted);
  renderHeading();
  renderFilters();
  try {
    await ensureTags();
    restoreUrl();
    // Nhường một lượt vẽ bằng timer tĩnh; đây không phải vòng lặp hoặc hoạt ảnh JavaScript.
    setTimeout(loadPopularCounts, 0);
    if (!submitted.q && !submitted.tags.length && window.innerWidth > 600) {
      searchBar.focus();
    }
  } catch (error) {
    searchBar.setBusy(false);
    qs('[data-error-message]').textContent = toVietnameseMessage(error);
    errorBox.hidden = false;
    renderPopularTags();
  }
}

// Các lần tìm chỉ đến từ gửi form, URL, tag click, tải thêm hoặc nút thử lại; không nghe input tại trang.
window.addEventListener('popstate', restoreUrl);
window.addEventListener('pagehide', leavePage);
backButton.addEventListener('click', goBack);
qs('[data-write-post]').addEventListener('click', writePost);
qs('[data-clear-tags]').addEventListener('click', clearTags);
qs('[data-empty-clear]').addEventListener('click', clearTags);
qs('[data-retry]').addEventListener('click', retrySearch);
moreButton.addEventListener('click', loadMore);
results.addEventListener('click', handleResultTag);
sortButton.addEventListener('click', toggleSort);
sortOptions.addEventListener('click', chooseSort);
document.addEventListener('click', handleDocumentEvent);
document.addEventListener('keydown', handleDocumentEvent);
void initialize();
