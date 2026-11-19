/**
 * Điểm truy cập bài viết cho trang tìm kiếm.
 * Khi có WebSocket, chỉ cần đổi lớp vận chuyển tại đây thay vì sửa trang.
 */
import { request } from '/services/api/client.js';
import { formatHandle } from '/utils/username.js';
import { backendSupports } from '/services/api/capabilities.js';
import { getNotificationPost, notifyAfter, notifyMentions, notifyPostFollowers } from '/services/api/notify-actions.js';

/**
 * Tìm bài qua HTTP sau khi người dùng gửi biểu mẫu tìm kiếm.
 * @param {object} options Từ khoá, mã thẻ, phân trang và tín hiệu huỷ.
 * @returns {Promise<Array>} Danh sách bài viết chưa bổ sung tác giả và thẻ.
 */
export function searchPosts({ q, tagIds = [], limit = 10, offset = 0, signal } = {}) {
  return request('/posts', {
    query: { q, tags: tagIds.join(','), limit, offset },
    signal,
  });
}

/**
 * Lấy thẻ để bổ sung vào kết quả ở trang tìm kiếm và trang đọc bài.
 * @param {string} postId Mã bài viết.
 * @returns {Promise<Array>} Các thẻ gắn với bài viết.
 */
export function getPostTags(postId) {
  return request('/posts/' + encodeURIComponent(postId) + '/tags');
}

// Gom các đường dẫn của Trang chủ để đổi sang endpoint riêng khi backend hoàn tất; tab Phổ biến ghép riêng ở listPopularPosts.
const HOME_FEED_ENDPOINTS = Object.freeze({
  newest: '/posts',
  question: '/posts/qa',
  following: '/my/following/posts',
});

// Bảng xếp hạng gồm highlight (hạng 1-12) và popular (hạng 13-15), nên danh sách ghép tối đa 15 bài.
const POPULAR_MERGED_LIMIT = 15;
// Số bình luận chỉ nhớ một lúc ngắn; bảng xếp hạng nhớ đến khi tải lại trang để khối nổi bật và tab Phổ biến dùng chung.
const COMMENT_COUNT_CACHE_MS = 30000;
let highlightRequest = null;
const commentCountCache = new Map();

/** Tải top 12 đúng một lần cho mỗi lần mở trang; lỗi thì bỏ kết quả để nút Thử lại gửi được yêu cầu mới. */
export function listHighlightPosts() {
  if (!highlightRequest) {
    const pending = request('/posts/highlight', { auth: false });
    highlightRequest = pending;
    pending.catch(() => {
      if (highlightRequest === pending) highlightRequest = null;
    });
  }
  return highlightRequest;
}

/** Ghép highlight trước popular, bỏ bài trùng theo id, giữ nguyên thứ hạng và không vượt quá 15 bài. */
export function mergePopularPosts(highlight, popular, limit = POPULAR_MERGED_LIMIT) {
  const seen = new Set();
  const merged = [];
  for (const post of [...(highlight || []), ...(popular || [])]) {
    if (post?.id && !seen.has(post.id) && merged.length < limit) {
      seen.add(post.id);
      merged.push(post);
    }
  }
  return merged;
}

/** Trang chủ lấy các bài cuối danh sách ghép: đủ 15 bài là hạng 13-15, ít bài thì tab vẫn không trống. */
export function homePopularPosts(merged, limit = 3) {
  return (merged || []).slice(-limit);
}

/** Danh sách Phổ biến đầy đủ; popular rỗng khi tổng số bài không quá 12 là trường hợp bình thường. */
export async function listPopularPosts({ signal } = {}) {
  const [highlight, popular] = await Promise.all([
    listHighlightPosts(),
    request('/posts/popular', { signal, auth: false }),
  ]);
  return mergePopularPosts(highlight, popular);
}

// CẦN BACKEND: GET /posts/newest, /posts/qa, /my/following/posts còn truncate(3) và chưa nhận limit; khi có route mới chỉ cần đổi HOME_FEED_ENDPOINTS và hàm này.
/** Lấy bảng tin Trang chủ; tab theo dõi cần JWT và chỉ gọi khi máy chủ hỗ trợ. */
export async function listHomeFeed(tab, { limit, lang, signal } = {}) {
  // Giữ trạng thái trung tính và không gửi request theo dõi khi cờ hỗ trợ đang tắt.
  if (tab === 'following' && !backendSupports.followingFeed) {
    return null;
  }
  // Tab Phổ biến dùng chung lần tải highlight với khối nổi bật, chỉ hiện các bài cuối danh sách ghép.
  if (tab === 'popular') {
    return homePopularPosts(await listPopularPosts({ signal }), limit);
  }
  // Bài mới dùng GET /posts có limit sẵn; trang chỉ truyền lang khi cờ autoTranslateFeed đã bật.
  if (tab === 'newest') {
    return request(HOME_FEED_ENDPOINTS.newest, { query: { limit, lang }, signal, auth: false });
  }
  // Các route tạm còn lại chưa nhận limit; chỉ tab theo dõi gửi JWT.
  return request(HOME_FEED_ENDPOINTS[tab], { signal, auth: tab === 'following' });
}

// CẦN BACKEND: GET /posts?lang=vi trả title/content đã dịch, original_language và is_translated.
/** Lấy bài mới có phân trang hoặc danh sách phổ biến qua endpoint riêng phục vụ Diễn đàn. */
export async function listPosts({ limit = 5, offset = 0, tagIds = [], sort = 'newest', lang, signal } = {}) {
  if (lang && !backendSupports.autoTranslateFeed) {
    return null;
  }
  // Diễn đàn hiện cả danh sách ghép (tối đa 15 bài), không có trang tiếp theo.
  if (sort === 'popular') {
    return listPopularPosts({ signal });
  }
  return request('/posts', {
    query: { limit, offset, tags: tagIds.join(','), lang },
    signal,
  });
}

// CẦN BACKEND: GET /posts/highlight nên nhúng author, tags và số đếm để thẻ nổi bật không phải tải riêng từng bài.
/** Đọc top bài nổi bật theo thứ hạng; chưa hỗ trợ thì giữ khung chờ dữ liệu trung tính. */
export async function getFeaturedPosts({ limit = 12 } = {}) {
  if (!backendSupports.featuredPosts) {
    return null;
  }
  return (await listHighlightPosts() || []).slice(0, limit);
}

/** Đếm bình luận thật của một bài (gồm trả lời); nhớ ngắn trong bộ nhớ để không gọi lặp khi vẽ lại thẻ. */
export function getPostCommentCount(postId) {
  const key = String(postId);
  const cached = commentCountCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.promise;
  }
  const promise = request('/posts/' + encodeURIComponent(postId) + '/comments/count', { auth: false })
    .then(result => (Number.isFinite(result?.count) ? result.count : null));
  const entry = { expires: Date.now() + COMMENT_COUNT_CACHE_MS, promise };
  commentCountCache.set(key, entry);
  // Lỗi không được nhớ lại, lần vẽ sau còn cơ hội lấy số thật.
  promise.catch(() => {
    if (commentCountCache.get(key) === entry) commentCountCache.delete(key);
  });
  return promise;
}

// CẦN BACKEND: GET /posts nên trả comment_count, like_count để thẻ bài không phải gọi riêng từng bài.
/** Thống kê của một thẻ đã hiển thị; số nào lỗi hoặc chưa có thì trả null để thẻ giữ dấu gạch trung tính. */
export async function getPostStats(postId, post = null) {
  if (!backendSupports.postStats) {
    return null;
  }
  let commentCount = post?.comment_count ?? null;
  if (commentCount === null) {
    try {
      commentCount = await getPostCommentCount(postId);
    } catch {
      // Số bình luận chỉ là thông tin phụ, lỗi mạng không được làm hỏng thẻ bài.
      commentCount = null;
    }
  }
  return {
    comment_count: commentCount,
    like_count: post?.like_count ?? null,
  };
}

// CẦN BACKEND: /my/following/posts phục vụ Diễn đàn, cần JWT, không phân trang; hiện backend tạm cắt còn 3 bài (truncate(3)), chờ BE trả danh sách đầy đủ, kèm author, tags và số đếm.
/**
 * Lấy bài của những người mình đang theo dõi cho Diễn đàn.
 * Route đã hoạt động với cờ followingFeed bật; chỉ trả null nếu cấu hình tắt hỗ trợ.
 * @param {object} options Tín hiệu huỷ khi người dùng đổi tab.
 * @returns {Promise<Array|null>} Danh sách bài, hoặc null khi máy chủ chưa hỗ trợ.
 */
export function listFollowingFeed({ signal } = {}) {
  if (!backendSupports.followingFeed) {
    return Promise.resolve(null);
  }
  return request('/my/following/posts', { signal });
}

// CẦN BACKEND: /posts/qa phục vụ Diễn đàn, không phân trang; hiện backend tạm cắt còn 3 bài (truncate(3)), chờ BE trả danh sách đầy đủ, kèm author, tags và số đếm.
/** Lấy bài hỏi đáp đã xuất bản qua endpoint riêng, không cần tải danh mục tag để tìm mã question. */
export function listQuestionPosts({ signal } = {}) {
  return request('/posts/qa', { signal });
}

/**
 * Lấy một bài viết cho trang đọc bài; API trả 404 khi bài bị ẩn, bị xoá hoặc không tồn tại.
 * @param {string} postId Mã bài viết lấy từ tham số id trên URL.
 * @returns {Promise<object>} PostResponse gồm tiêu đề, nội dung, ngôn ngữ, toạ độ và comments_locked.
 */
export function getPost(postId) {
  return request('/posts/' + encodeURIComponent(postId));
}

/**
 * Lấy toàn bộ bài đã đăng của một tác giả; trang đọc bài đếm số phần tử để hiện "Bài viết".
 * @param {string} userId Mã tác giả.
 * @returns {Promise<Array>} Danh sách PostResponse (API hiện không phân trang endpoint này).
 */
export function listUserPosts(userId) {
  return request('/users/' + encodeURIComponent(userId) + '/posts');
}

/**
 * Dịch bài sang ngôn ngữ giao diện của người đang đăng nhập (POST /posts/{id}/translate, cần JWT).
 * @param {string} postId Mã bài viết.
 * @returns {Promise<object>} { language, source_language, title, content, translated }.
 */
export function translatePost(postId) {
  return request('/posts/' + encodeURIComponent(postId) + '/translate', { method: 'POST' });
}

// CẦN BACKEND: GET /posts/{id}/related?limit=3 trả bài liên quan đã xếp hạng, mỗi bài kèm comment_count và tags[{id,name}]. Chưa có thì trang tự tìm bài cùng tag đầu tiên bằng GET /posts?tags= (dữ liệu thật, chỉ thiếu số bình luận).
/**
 * Lấy tối đa 3 bài liên quan cho thẻ "Bài viết liên quan" của trang đọc bài.
 * @param {object} post Bài đang đọc.
 * @param {Array} postTags Thẻ thật của bài, dùng cho cách dự phòng khi backend chưa có endpoint.
 * @returns {Promise<Array>} Mỗi phần tử có id, title, comment_count (null nếu chưa biết) và tag {id,name}.
 */
export async function getRelatedPosts(post, postTags = []) {
  if (backendSupports.relatedPosts) {
    const items = await request('/posts/' + encodeURIComponent(post.id) + '/related', { query: { limit: 3 } });
    return (items || []).map(item => ({ ...item, tag: item.tag || item.tags?.[0] || null }));
  }
  const tag = postTags[0];
  if (!tag) {
    return [];
  }
  // Lấy 4 bài để còn đủ 3 bài sau khi bỏ chính bài đang đọc.
  const posts = await searchPosts({ tagIds: [tag.id], limit: 4 });
  return (posts || [])
    .filter(item => item.id !== post.id)
    .slice(0, 3)
    .map(item => ({ ...item, comment_count: item.comment_count ?? null, tag }));
}

// CẦN BACKEND: POST/PATCH/GET posts cần place_name (tên địa điểm); Phong đã đồng ý bổ sung; FE dùng reverse/cache cho địa chỉ, không yêu cầu giờ mở cửa hoặc điện thoại.
/**
 * Đọc thông tin địa điểm văn hoá của bài; null nghĩa là chưa biết, trang hiện thanh xám.
 * @param {object} post Bài đang đọc.
 * @returns {object|null} Thông tin địa điểm hoặc null khi backend chưa hỗ trợ.
 */
export function getPostPlace(post) {
  return post?.place_name ? { name: post.place_name, address: post.place?.address || '' }
    : backendSupports.postPlace && post?.place ? post.place : null;
}

/**
 * Đăng bài mới từ ô viết bài của Diễn đàn (cần JWT); backend tự nhận diện ngôn ngữ.
 * @param {object} draft { title, content } người dùng nhập.
 * @param {object} options tagIds là các mã chủ đề cần gắn trước khi báo người theo dõi.
 * @returns {Promise<object>} PostResponse kèm failedTagIds cục bộ để trang báo chủ đề chưa gắn được.
 */
export async function createPost({ title, content, latitude, longitude }, { tagIds = [] } = {}) {
  // CẦN BACKEND: POST/PATCH/GET posts cần thêm place_name; hiện chỉ gửi toạ độ có trong hợp đồng.
  const coordinates = Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : {};
  const post = await request('/posts', { method: 'POST', body: { title, content, ...coordinates } });
  const failedTagIds = [];
  // Gắn từng chủ đề trước khi thông báo; lỗi tag không được làm người dùng đăng lại một bài đã tạo.
  for (const tagId of new Set(tagIds)) {
    try {
      await addPostTag(post.id, tagId);
    } catch {
      // Trả mã tag lỗi cho trang hiển thị cảnh báo thật, giữ nguyên bài đã đăng.
      failedTagIds.push(tagId);
    }
  }
  await notifyPostFollowers(post);
  await notifyMentions({ postId: post.id }, post.content ?? content);
  return { ...post, failedTagIds };
}

/**
 * Dựng dữ liệu sửa bài mà không làm mất địa điểm: place bỏ trống thì giữ toạ độ hiện có,
 * place là null nghĩa là người dùng chủ động gỡ, còn đối tượng place là vị trí mới.
 * @param {object} post Bài đang sửa.
 * @param {object} changes { title, content, place }.
 * @returns {object} { title, content, latitude?, longitude? } cho updatePost.
 */
export function buildPostEdit(post, { title, content, place }) {
  const source = place === undefined ? post : place;
  const hasCoordinates = Number.isFinite(source?.latitude) && Number.isFinite(source?.longitude);
  return { title, content, ...(hasCoordinates ? { latitude: source.latitude, longitude: source.longitude } : {}) };
}

/**
 * Sửa bài của chính mình (tiêu đề bắt buộc). Backend coi thiếu toạ độ là xoá địa điểm, nên nơi gọi dùng buildPostEdit.
 * @param {string} postId Mã bài viết.
 * @param {object} changes { title, content, latitude, longitude }.
 * @returns {Promise<object>} Bài sau khi sửa.
 */
export async function updatePost(postId, { title, content, latitude = null, longitude = null }) {
  // Toạ độ thiếu nghĩa là gỡ địa điểm; không gửi null ngoài hợp đồng UpdatePostRequest.
  const coordinates = Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : {};
  const updated = await request('/posts/' + encodeURIComponent(postId), { method: 'PATCH', body: { title, content, ...coordinates } });
  // Máy chủ chống trùng nên người đã được nhắc từ trước không nhận thêm thông báo.
  await notifyMentions({ postId }, updated?.content ?? content);
  return updated;
}

/**
 * Xoá mềm bài viết (tác giả hoặc staff); staff có thể khôi phục.
 * @param {string} postId Mã bài viết.
 * @param {object} options authorId và title giúp báo tác giả sau khi bài đã bị xoá.
 * @returns {Promise<null>} Phản hồi rỗng (204).
 */
export async function deletePost(postId, { authorId, title } = {}) {
  // Lấy dữ liệu còn thiếu trước khi xoá vì GET công khai không đọc được bài đã xoá.
  const details = await getNotificationPost(postId, { authorId, title }, true);
  const result = await request('/posts/' + encodeURIComponent(postId), { method: 'DELETE' });
  // Không đọc lại bài sau DELETE, kể cả lần bổ sung trước đó thất bại; helper tự bỏ qua khi thiếu tác giả.
  await notifyAfter('post_removed', {
    targetUserId: details.authorId, link: '/posts/' + encodeURIComponent(postId), context: { post_title: details.title },
  });
  return result;
}

/**
 * Gắn một tag vào bài của chính mình ngay sau khi đăng (API trả 204).
 * @param {string} postId Mã bài viết.
 * @param {string} tagId Mã tag lấy từ GET /tags.
 * @returns {Promise<null>} Phản hồi rỗng khi thành công.
 */
export function addPostTag(postId, tagId) {
  return request('/posts/' + encodeURIComponent(postId) + '/tags/' + encodeURIComponent(tagId), { method: 'POST' });
}

// CẦN BACKEND: POST /posts nhận thêm poll: { question, options: [string], closes_at? }; GET /posts/{id} trả poll kèm số phiếu từng lựa chọn và lựa chọn của người xem; POST /posts/{id}/poll/votes { option_index } để bỏ phiếu.
/**
 * Cho trang biết có tạo được thăm dò hay chưa, để không hiện biểu mẫu gửi đi một trường backend bỏ qua.
 * @returns {boolean} true khi backend đã hỗ trợ thăm dò.
 */
export function supportsPolls() {
  return backendSupports.postPolls;
}

// CẦN BACKEND: users đã có displayname và username duy nhất; GET /posts và comments cần nhúng author { id, displayname, username, avatar_url, native } để bớt gọi GET /users/{id}.
/** Chọn tên hiển thị thật từ hồ sơ đã tải, không phát sinh yêu cầu hồ sơ bổ sung. */
export function getAuthorDisplayName(author) {
  return author?.displayname || author?.username;
}

/** Handle luôn lấy username duy nhất, không tạo @ từ tên hiển thị. */
export function getAuthorHandle(author) {
  return formatHandle(author?.username);
}

// CẦN BACKEND: gợi ý và tác giả nhúng cần displayname; danh sách theo dõi đã có displayname, còn thiếu phân trang.
/** Nhãn trên giao diện phân biệt tên tự do với handle dự phòng; thiếu cả hai thì giữ chỗ. */
export function getAuthorLabel(author) {
  return author?.displayname ? getAuthorDisplayName(author)
    : author?.username ? getAuthorHandle(author) : undefined;
}
