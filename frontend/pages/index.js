/** Trang chủ Home 4: dữ liệu thật, khung chờ trung tính và thao tác tường minh. */
import { getAuthorLabel, getAuthorHandle } from '/services/api/posts.js';
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { createFeaturedCard, createFeaturedPlaceholder } from '/components/featured-card/featured-card.js';
import { createFeedPostCard } from '/components/postcard/PostCard.js';
import { listHomeFeed, getFeaturedPosts, getPostTags, getPostStats } from '/services/api/posts.js';
import { backendSupports } from '/services/api/capabilities.js';
import { getMyRecommendations } from '/services/api/recommendations.js';
import { getReactionSummary } from '/services/api/reactions.js';
import { bookmarkPost, unbookmarkPost, getBookmarkState } from '/services/api/bookmarks.js';
import { followUser, unfollowUser } from '/services/api/follows.js';
import { getUser } from '/services/api/users.js';
import { listTags } from '/services/api/tags.js';
import { readStorage } from '/services/api/client.js';
import { fetchCurrentUser, getCachedUser, requireAuth } from '/utils/auth.js';
import { el, qs, qsa } from '/utils/dom.js';
import { initials } from '/utils/format.js';
import { wrapJapanese } from '/utils/text.js';
import { toVietnameseMessage } from '/utils/errors.js';
import { routes, searchUrl, withRedirect } from '/utils/routes.js';

// Figma Home 4 (140:135): mỗi tab của "Bài viết mới" chỉ hiện 3 bài, phần còn lại xem ở Diễn đàn qua "Xem thêm →".
const HOME_LATEST_LIMIT = 3;

// Header có form riêng của Home, còn footer tái dùng biến thể đầy đủ của trang nội dung.
mountHeader(qs('[data-component="header"]'), { active: 'home', searchForm: true });
mountFooter();

// Mỗi lần đổi tab có mã riêng để kết quả yêu cầu cũ không ghi đè lên lựa chọn mới.
const feedList = qs('[data-feed-list]');
const feedStatus = qs('[data-feed-status]');
const errorBox = qs('[data-home-error]');
const compactFeatured = window.matchMedia('(max-width: 960px)');
const bookmarkStates = new Map();
let user = getCachedUser();
let tags = [];
let featured = null;
let featuredPage = 0;
// Thông tin phụ của thẻ nổi bật: chỉ tải khi thẻ đang hiện, trang đã xem thì dùng lại khi quay về.
const featuredExtras = new Map();
const featuredRequests = new Map();
let featuredVersion = 0;
let selectedFeed = 'newest';
let feedVersion = 0;
let feedController = null;

/** Báo lỗi tiếng Việt trong vùng alert dùng chung, không dùng alert() của trình duyệt. */
function showError(error) {
  errorBox.textContent = toVietnameseMessage(error);
  errorBox.hidden = false;
}

/** Tạo thanh chờ tĩnh bằng DOM, không có dữ liệu giả hay hoạt ảnh. */
function placeholder(short = false, title = false) {
  return el('span', {
    className: 'u-placeholder-bar' + (short ? ' u-placeholder-bar--short' : '')
      + (title ? ' u-placeholder-bar--title' : ''),
    'aria-hidden': 'true',
  });
}

/** Liên kết đăng nhập giữ đường dẫn Home làm trang quay lại sau khi có phiên. */
function loginLink() {
  return el('a', {
    className: 'btn btn--secondary btn--sm',
    href: withRedirect(routes.login, location.pathname + location.search),
  }, 'Đăng nhập');
}

/** Cánh hoa là ảnh trang trí tĩnh; vị trí và góc xoay nằm trong CSS để không có inline style. */
function mountPetals() {
  const hero = qs('[data-hero-petals]');
  const gutter = qs('[data-gutter-petals]');
  // Sáu cánh trên ảnh và mười bốn cánh bên lề chỉ dùng các tài nguyên đã tải sẵn.
  for (let index = 1; index <= 20; index += 1) {
    const image = el('img', {
      className: 'home-petal home-petal--' + index,
      src: '/assets/illustrations/sakura-' + index + '.svg', alt: '',
    });
    (index <= 14 ? gutter : hero).append(image);
  }
}

/** Tính số thẻ mỗi trang theo cùng breakpoint với CSS, không dùng cuộn hay animation. */
function featuredPageSize() {
  return compactFeatured.matches ? 1 : 3;
}

/** Dựng thẻ nổi bật từ bài và phần thông tin phụ đã tải; mã bài giúp thay đúng thẻ khi có dữ liệu mới. */
function createFeaturedNode(post, rank) {
  const card = createFeaturedCard({ post, rank, ...featuredExtras.get(post.id) });
  card.dataset.featuredPostId = post.id;
  return card;
}

/** Tải tác giả, tag và số bình luận của một bài đúng một lần; phần lỗi để trống và được thử lại khi thẻ hiện lần sau. */
function loadFeaturedExtra(post) {
  if (!featuredRequests.has(post.id)) {
    const pending = Promise.all([
      getUser(post.author_id).catch(() => undefined),
      getPostTags(post.id).catch(() => undefined),
      getPostStats(post.id, post),
    ]).then(([author, postTags, stats]) => {
      featuredExtras.set(post.id, { author, tags: postTags, commentCount: stats?.comment_count ?? undefined });
      // Thiếu phần nào thì bỏ dấu đã tải, lần sau thẻ hiện lại sẽ thử lại phần đó.
      if (!author || !postTags) {
        featuredRequests.delete(post.id);
      }
    });
    featuredRequests.set(post.id, pending);
  }
  return featuredRequests.get(post.id);
}

/** Thay thẻ đang hiện bằng bản đủ dữ liệu; thẻ giữ focus thì chờ focus rời đi để không mất vị trí bàn phím. */
function refreshFeaturedCard(post, rank, version) {
  const target = qs('[data-featured-post-id="' + CSS.escape(String(post.id)) + '"]', qs('[data-featured-cards]'));
  if (!target) {
    return;
  }
  if (target.contains(document.activeElement)) {
    /** Cập nhật thẻ khi focus đã rời khỏi thẻ và trang nổi bật chưa đổi. */
    function updateAfterFocusLeaves(event) {
      if (!target.contains(event.relatedTarget)) {
        target.removeEventListener('focusout', updateAfterFocusLeaves);
        if (version === featuredVersion && target.isConnected) {
          target.replaceWith(createFeaturedNode(post, rank));
        }
      }
    }
    target.addEventListener('focusout', updateAfterFocusLeaves);
    return;
  }
  target.replaceWith(createFeaturedNode(post, rank));
}

/** Chỉ bổ sung các thẻ của trang đang xem, lần lượt từng thẻ; đổi trang thì dừng lượt cũ. */
async function enrichVisibleFeatured() {
  const version = ++featuredVersion;
  const size = featuredPageSize();
  const start = featuredPage * size;
  for (const [offset, post] of featured.slice(start, start + size).entries()) {
    // Thẻ đã đủ dữ liệu được vẽ sẵn từ bộ nhớ, không gọi lại máy chủ khi quay về trang cũ.
    if (featuredExtras.has(post.id) && featuredRequests.has(post.id)) {
      continue;
    }
    await loadFeaturedExtra(post);
    if (version !== featuredVersion) {
      return;
    }
    refreshFeaturedCard(post, start + offset + 1, version);
  }
}

/** Vẽ trang nổi bật bằng bài thật có thứ hạng hoặc ba khung chờ khi chưa có hợp đồng. */
function renderFeatured(restoreDotFocus = false) {
  const size = featuredPageSize();
  const available = Array.isArray(featured) && featured.length > 0;
  const pageCount = Math.ceil((available ? featured.length : 3) / size);
  featuredPage = Math.min(featuredPage, pageCount - 1);
  const row = qs('[data-featured-cards]');
  row.replaceChildren();
  // Chỉ gắn thẻ thuộc trang hiện tại nên liên kết của trang ẩn không nhận focus.
  for (let index = featuredPage * size; index < Math.min((featuredPage + 1) * size, available ? featured.length : 3); index += 1) {
    row.append(available ? createFeaturedNode(featured[index], index + 1) : createFeaturedPlaceholder(index + 1));
  }
  const note = qs('[data-featured-note]');
  note.hidden = available;
  note.textContent = backendSupports.featuredPosts
    ? 'Chưa có dữ liệu bài viết nổi bật.'
    : 'Bài viết nổi bật sẽ hiển thị khi máy chủ hỗ trợ xếp hạng.';
  const dots = qs('[data-featured-dots]');
  dots.replaceChildren();
  const dotCount = available ? pageCount : compactFeatured.matches ? 3 : 4;
  // Khi chưa có dữ liệu, chấm chỉ giữ hình dáng Figma và không giả hành vi phân trang.
  for (let index = 0; index < dotCount; index += 1) {
    const dot = el('button', {
      type: 'button', className: 'home-featured__dot' + (index === featuredPage ? ' is-active' : ''),
      'aria-label': 'Trang nổi bật ' + (index + 1),
      'aria-current': index === featuredPage ? 'page' : null,
      'data-featured-page': index,
      disabled: !available,
    });
    dots.append(dot);
  }
  if (restoreDotFocus) {
    qs('[data-featured-page="' + featuredPage + '"]', dots)?.focus();
  }
  if (available) {
    void enrichVisibleFeatured();
  }
}

/** Chọn trang từ chấm được nhấn, giữ focus ở chấm sau khi dựng lại DOM. */
function chooseFeaturedPage(event) {
  const dot = event.target.closest('[data-featured-page]');
  if (!dot || dot.disabled) {
    return;
  }
  featuredPage = Number(dot.dataset.featuredPage);
  renderFeatured(true);
}

/** Khi đổi cỡ màn hình, giữ bài đầu trang hiện tại rồi tính lại số trang. */
function resizeFeatured(event) {
  const previousSize = event.matches ? 3 : 1;
  featuredPage = Math.floor(featuredPage * previousSize / featuredPageSize());
  renderFeatured();
}

/** Dựng avatar thành viên thật, dùng chữ đầu khi không có ảnh hoặc ảnh hỏng. */
function memberAvatar(member) {
  const avatar = el('span', { className: 'avatar home-member__avatar' }, initials(member.displayname || member.username));
  if (member.avatar_url) {
    const image = el('img', { src: member.avatar_url, alt: getAuthorLabel(member), width: 40, height: 40, loading: 'lazy' });
    /** Đổi ảnh hỏng về chữ đầu tên thật để không hiện icon ảnh lỗi. */
    function useInitials() {
      avatar.replaceChildren(initials(member.displayname || member.username));
    }
    image.addEventListener('error', useInitials, { once: true });
    avatar.replaceChildren(image);
  }
  return avatar;
}

/** Nút theo dõi chỉ đổi nhãn khi POST hoặc DELETE thật đã thành công. */
function createFollowButton(memberId) {
  let following = false;
  const button = el('button', {
    className: 'btn btn--danger-outline btn--sm home-member__follow', type: 'button', 'aria-pressed': 'false',
  }, 'Theo dõi');
  /** Kiểm tra phiên trước khi theo dõi, chặn nhấn lặp và báo lỗi bằng alert trong trang. */
  async function toggleFollow() {
    button.disabled = true;
    errorBox.hidden = true;
    try {
      if (!await requireAuth()) {
        return;
      }
      if (following) {
        await unfollowUser(memberId);
      } else {
        await followUser(memberId);
      }
      following = !following;
      button.textContent = following ? 'Đang theo dõi' : 'Theo dõi';
      button.setAttribute('aria-pressed', String(following));
    } catch (error) {
      showError(error);
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener('click', toggleFollow);
  return button;
}

/** Dựng bài gợi ý thật hoặc một hàng xám trung tính, kanji chỉ là phần trang trí theo tag. */
function createSuggestedPost(post) {
  const kanji = { general: '総', question: '問', discussion: '談', announcement: '告', showcase: '作' };
  const thumb = el('span', {
    className: 'home-suggestion__thumb' + (post ? '' : ' home-suggestion__thumb--placeholder'),
    'aria-hidden': 'true', lang: 'ja',
  }, kanji[post?.tag?.name] || '越');
  const text = el('div', { className: 'home-suggestion__text' });
  if (post) {
    text.append(el('a', { className: 'home-suggestion__title', href: routes.post(post.id) }, wrapJapanese(post.title)),
      el('p', { className: 'home-suggestion__meta' },
        (Number.isFinite(post.comment_count) ? post.comment_count : '–') + ' bình luận',
        post.tag?.name ? wrapJapanese(' · ' + post.tag.name) : null));
  } else {
    text.append(placeholder(false, true), placeholder(true),
      el('p', { className: 'home-suggestion__meta' }, '– bình luận'));
  }
  return el('div', { className: 'home-suggestion' }, thumb, text);
}

/** Dựng thành viên được gợi ý hoặc hàng chờ với nút khoá khi chưa có thông tin thật. */
function createSuggestedMember(member) {
  const text = el('div', { className: 'home-member__text' });
  if (member) {
    text.append(el('span', { className: 'home-member__name' }, wrapJapanese(getAuthorLabel(member))),
      el('p', { className: 'home-member__sub' }, wrapJapanese(getAuthorHandle(member)
        + (member.address ? ' · ' + member.address : member.institute ? ' · ' + member.institute : ''))));
  } else {
    text.append(placeholder(false, true), placeholder(true));
  }
  return el('div', { className: 'home-member' }, member ? memberAvatar(member)
    : el('span', { className: 'home-member__avatar home-member__avatar--placeholder', 'aria-hidden': 'true' }),
  text, member ? createFollowButton(member.id) : el('button', {
    type: 'button', className: 'btn btn--danger-outline btn--sm home-member__follow', disabled: true,
  }, 'Theo dõi'));
}

/** Gợi ý vẫn giữ đủ ba khối khi chưa hỗ trợ; danh mục chủ đề là tag thật từ GET /tags. */
function renderRecommendations(data = null) {
  const personal = user ? data : null;
  const body = el('div', { className: 'home-recommendations__body' });
  if (!user) {
    body.append(el('div', { className: 'home-recommendations__signin' },
      el('p', {}, 'Đăng nhập để nhận gợi ý theo chủ đề bạn đã chọn.'), loginLink()));
  }
  const topics = el('div', { className: 'home-recommendations__topics' });
  const selectedTopics = personal?.topics ?? tags;
  // Không gán chủ đề giả: lúc danh mục chưa có, chỉ giữ hai thanh xám.
  for (const tag of selectedTopics) {
    topics.append(el('a', {
      className: 'featured-card__chip', href: searchUrl({ tags: [tag.name] }),
    }, wrapJapanese('#' + tag.name)));
  }
  if (!selectedTopics.length) {
    topics.append(placeholder(), placeholder(true));
  }
  body.append(el('section', { className: 'home-recommendations__group', 'aria-label': 'Chủ đề phù hợp' },
    el('h3', { className: 'home-recommendations__eyebrow' }, 'CHỦ ĐỀ PHÙ HỢP'), topics));
  const posts = el('section', { className: 'home-recommendations__group', 'aria-label': 'Bài viết gợi ý' },
    el('h3', { className: 'home-recommendations__eyebrow' }, 'BÀI VIẾT GỢI Ý'));
  const members = el('section', { className: 'home-recommendations__group', 'aria-label': 'Thành viên nên theo dõi' },
    el('h3', { className: 'home-recommendations__eyebrow' }, 'THÀNH VIÊN NÊN THEO DÕI'));
  // Giữ ba vị trí để bố cục giống Figma cả khi máy chủ trả ít gợi ý hoặc người xem chưa đăng nhập.
  for (let index = 0; index < 3; index += 1) {
    posts.append(createSuggestedPost(personal?.posts?.[index]));
    members.append(createSuggestedMember(personal?.members?.[index]));
  }
  body.append(posts, members);
  qs('[data-recommendations]').replaceChildren(
    el('div', { className: 'home-recommendations__band' },
      el('img', { src: '/assets/icons/torii-mini.svg', alt: '', width: 58, height: 48, 'aria-hidden': 'true' }),
      el('p', {}, wrapJapanese(user ? 'Dành riêng cho ' + getAuthorLabel(user) : 'Gợi ý cho bạn'))), body);
}

/** Thẻ tải tĩnh giữ chiều cao bảng tin mà không có spinner hoặc shimmer. */
function createFeedPlaceholder() {
  return el('div', { className: 'postcard postcard--feed home-feed__placeholder', 'aria-hidden': 'true' },
    el('div', { className: 'postcard-feed__user' },
      el('span', { className: 'postcard-feed__avatar postcard-feed__avatar--placeholder' }),
      el('div', { className: 'postcard-feed__identity' }, placeholder(true, true), placeholder(true))),
    placeholder(), placeholder(), placeholder(true));
}

/** Hiện thông báo cho tab chưa có API hoặc bảng tin rỗng; có thể kèm nút đăng nhập. */
function showFeedInfo(message, needsLogin = false) {
  feedList.replaceChildren(el('div', { className: 'home-feed__info' }, el('p', {}, message), needsLogin ? loginLink() : null));
  feedList.setAttribute('aria-busy', 'false');
  feedStatus.textContent = message;
}

/** Thực hiện lưu hoặc bỏ lưu thật, lưu trạng thái trong bộ nhớ để đổi tab không làm mất kết quả vừa thao tác. */
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

/** Dựng thẻ bằng dữ liệu đã có và ngôn ngữ người xem; không gọi mạng trong component. */
function feedCard(post, author, postTags = [], stats = null, bookmarked = null) {
  return createFeedPostCard(post, {
    author, tags: postTags, stats,
    viewerLanguage: getCachedUser()?.language || readStorage('etsubi_lang') || 'vi',
    bookmarked: bookmarkStates.has(post.id) ? bookmarkStates.get(post.id) : bookmarked,
    onBookmark: handleBookmark,
  });
}

/** Bổ sung từng bài theo thứ tự tác giả, tag, cảm xúc; dừng ngay khi người dùng đổi tab. */
async function enrichFeed(posts, version) {
  // Mỗi bài chỉ có ba lần gọi bổ sung theo yêu cầu; getUser đã có bộ nhớ dùng chung.
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
    } catch (error) {
      // Lỗi yêu cầu của tab cũ không được hiện lên tab người dùng vừa chọn.
      if (version === feedVersion) {
        showError(error);
      }
    }
    if (version !== feedVersion) {
      return;
    }
    try {
      postTags = await getPostTags(post.id);
    } catch (error) {
      // Giữ khung tag trung tính khi lỗi và chỉ báo lỗi cho danh sách hiện tại.
      if (version === feedVersion) {
        showError(error);
      }
    }
    if (version !== feedVersion) {
      return;
    }
    try {
      const summary = await getReactionSummary(post.id);
      if (Array.isArray(summary)) {
        const count = summary.reduce((total, reaction) => total + (Number.isFinite(reaction.count) ? reaction.count : 0), 0);
        stats = { ...stats, like_count: count };
      }
    } catch (error) {
      // Không thay số chưa có dữ liệu bằng số giả khi thống kê cảm xúc tải lỗi.
      if (version === feedVersion) {
        showError(error);
      }
    }
    if (version !== feedVersion) {
      return;
    }
    const target = Array.from(feedList.children).find(card => card.dataset.postId === String(post.id));
    // Không thay thẻ đang nhận focus vì việc bổ sung tác giả không được làm mất nút người dùng đang dùng.
    if (target?.contains(document.activeElement)) {
      /** Chờ focus rời cả thẻ rồi bổ sung, đọc lại bookmark đã thay đổi trong lúc người dùng thao tác. */
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

/** Tải bảng tin qua endpoint tương ứng; chỉ bảng tin theo dõi yêu cầu đăng nhập. */
async function loadFeed() {
  const version = ++feedVersion;
  feedController?.abort();
  feedController = new AbortController();
  const { signal } = feedController;
  feedList.setAttribute('aria-busy', 'true');
  feedStatus.textContent = 'Đang tải bài viết…';
  // Số khung chờ bằng giới hạn bài thật để giữ bố cục nhất quán khi tải.
  feedList.replaceChildren(...Array.from({ length: HOME_LATEST_LIMIT }, () => createFeedPlaceholder()));
  try {
    // Khách vẫn thấy lời mời đăng nhập, không gửi yêu cầu tới endpoint cần JWT.
    if (selectedFeed === 'following' && !user) {
      showFeedInfo('Đăng nhập để xem bài từ những người bạn theo dõi.', true);
      return;
    }
    const viewerLanguage = getCachedUser()?.language || readStorage('etsubi_lang') || 'vi';
    // Cả bốn tab dùng chung service Trang chủ để đổi endpoint tại một chỗ.
    const posts = await listHomeFeed(selectedFeed, { limit: HOME_LATEST_LIMIT,
      lang: backendSupports.autoTranslateFeed ? viewerLanguage : undefined, signal });
    if (version !== feedVersion) {
      return;
    }
    // Service trả null nghĩa là máy chủ chưa hỗ trợ bảng tin này: báo trung tính, không hiện lỗi.
    if (posts === null) {
      showFeedInfo('Bảng tin theo dõi sẽ có khi máy chủ hỗ trợ.');
      return;
    }
    if (!posts?.length) {
      showFeedInfo(selectedFeed === 'following' ? 'Bạn chưa theo dõi ai hoặc họ chưa đăng bài.' : 'Chưa có bài viết nào.');
      return;
    }
    // Mới nhất, Hỏi đáp và Theo dõi tự giới hạn trong lúc chờ endpoint riêng của Trang chủ nhận limit.
    const visiblePosts = posts.slice(0, HOME_LATEST_LIMIT);
    feedList.replaceChildren(...visiblePosts.map(post => feedCard(post, post.author, post.tags)));
    feedList.setAttribute('aria-busy', 'false');
    feedStatus.textContent = 'Đã tải ' + visiblePosts.length + ' bài viết.';
    await enrichFeed(visiblePosts, version);
  } catch (error) {
    if (version !== feedVersion || signal.aborted) {
      return;
    }
    const retry = el('button', { type: 'button', className: 'btn btn--secondary btn--sm' }, 'Thử lại');
    retry.addEventListener('click', loadFeed);
    feedList.replaceChildren(el('div', { className: 'alert alert--error home-feed__info', role: 'alert' },
      el('p', {}, toVietnameseMessage(error)), retry));
    feedStatus.textContent = 'Không tải được bài viết.';
    feedList.setAttribute('aria-busy', 'false');
  }
}

/** Chọn tab và cập nhật quan hệ ARIA trước khi thực hiện một lần tải tường minh. */
function activateTab(tab) {
  selectedFeed = tab.dataset.feedTab;
  // Roving tabindex chỉ để tab hiện tại nhận Tab, các phím mũi tên chuyển trực tiếp giữa tab.
  for (const candidate of qsa('[data-feed-tab]')) {
    const active = candidate === tab;
    candidate.classList.toggle('is-active', active);
    candidate.setAttribute('aria-selected', String(active));
    candidate.tabIndex = active ? 0 : -1;
  }
  feedList.setAttribute('aria-labelledby', tab.id);
  void loadFeed();
}

/** Click một tab kích hoạt danh sách tương ứng, không tải lại khi nhấn tab đang chọn. */
function handleTabClick(event) {
  const tab = event.target.closest('[data-feed-tab]');
  if (tab && tab.dataset.feedTab !== selectedFeed) {
    activateTab(tab);
  }
}

/** Mũi tên, Home và End di chuyển và chọn tab theo mẫu bàn phím của tablist. */
function handleTabKey(event) {
  const tab = event.target.closest('[data-feed-tab]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return;
  }
  event.preventDefault();
  const tabs = qsa('[data-feed-tab]');
  const current = tabs.indexOf(tab);
  let next = event.key === 'ArrowLeft' ? (current + tabs.length - 1) % tabs.length : (current + 1) % tabs.length;
  if (event.key === 'Home') {
    next = 0;
  } else if (event.key === 'End') {
    next = tabs.length - 1;
  }
  tabs[next].focus();
  activateTab(tabs[next]);
}

/** Đăng bài cần phiên thật; liên kết vẫn có href để người dùng có thể mở trang đích bằng trình duyệt. */
async function writePost(event) {
  event.preventDefault();
  const button = event.currentTarget;
  if (button.getAttribute('aria-disabled') === 'true') {
    return;
  }
  button.setAttribute('aria-disabled', 'true');
  try {
    if (await requireAuth()) {
      location.assign(routes.newPost);
    }
  } catch (error) {
    showError(error);
  } finally {
    button.removeAttribute('aria-disabled');
  }
}

/** Khởi tạo các phần độc lập; lỗi danh mục hoặc gợi ý không ngăn bảng tin mới tải thật. */
async function initialize() {
  mountPetals();
  renderFeatured();
  renderRecommendations();
  user = await fetchCurrentUser();
  // Chỉ thông báo tạm khoá khi hồ sơ thật có thời hạn còn hiệu lực.
  if (user?.mutedUntil && new Date(user.mutedUntil).getTime() > Date.now()) {
    const notice = qs('[data-mute-notice]');
    notice.textContent = 'Tài khoản đang bị tạm khoá chức năng viết đến '
      + new Date(user.mutedUntil).toLocaleString('vi-VN') + '. Bạn vẫn có thể đọc bài viết.';
    notice.hidden = false;
  }
  try {
    tags = await listTags();
  } catch (error) {
    showError(error);
  }
  renderRecommendations();
  try {
    featured = await getFeaturedPosts();
    renderFeatured();
  } catch (error) {
    showError(error);
  }
  if (user) {
    try {
      renderRecommendations(await getMyRecommendations());
    } catch (error) {
      showError(error);
    }
  }
  // Người dùng có thể đã chọn tab khi các phần đầu đang tải; luôn đọc lựa chọn hiện tại.
  void loadFeed();
}

/** Ngừng danh sách cũ khi rời trang; các lần bổ sung không có signal dừng ở ranh giới await. */
function leavePage(event) {
  if (!event.persisted) {
    feedVersion += 1;
    featuredVersion += 1;
    feedController?.abort();
  }
}

// Đăng ký thao tác một lần; không có listener input, scroll hoặc vòng lặp hoạt ảnh.
qs('[data-featured-dots]').addEventListener('click', chooseFeaturedPage);
compactFeatured.addEventListener('change', resizeFeatured);
qs('[data-feed-tabs]').addEventListener('click', handleTabClick);
qs('[data-feed-tabs]').addEventListener('keydown', handleTabKey);
qs('[data-write-post]').addEventListener('click', writePost);
window.addEventListener('pagehide', leavePage);
void initialize();
