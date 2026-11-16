/**
 * Điểm truy cập bài viết cho trang tìm kiếm.
 * Khi có WebSocket, chỉ cần đổi lớp vận chuyển tại đây thay vì sửa trang.
 */
import { request } from '/services/api/client.js';
import { formatHandle } from '/utils/username.js';
import { backendSupports } from '/services/api/capabilities.js';
import { getNotificationPost, notifyAfter, notifyPostFollowers } from '/services/api/notify-actions.js';

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

// Gom các đường dẫn của Trang chủ để đổi sang endpoint riêng khi backend hoàn tất.
const HOME_FEED_ENDPOINTS = Object.freeze({
  newest: '/posts',
  popular: '/posts/popular',
  question: '/posts/qa',
  following: '/my/following/posts',
});

// CẦN BACKEND: endpoint riêng cho trang chủ (BE đang làm), nhận limit; khi có route mới chỉ cần đổi HOME_FEED_ENDPOINTS và hàm này.
/** Lấy bảng tin Trang chủ; tab theo dõi cần JWT và chỉ gọi khi máy chủ hỗ trợ. */
export function listHomeFeed(tab, { limit, lang, signal } = {}) {
  // Giữ trạng thái trung tính và không gửi request theo dõi khi cờ hỗ trợ đang tắt.
  if (tab === 'following' && !backendSupports.followingFeed) {
    return Promise.resolve(null);
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
  // CẦN BACKEND: /posts/popular phục vụ Diễn đàn, không phân trang; hiện backend tạm cắt còn 3 bài (truncate(3)), chờ BE trả danh sách đầy đủ, kèm author, tags và số đếm.
  if (sort === 'popular') {
    return request('/posts/popular', { signal });
  }
  return request('/posts', {
    query: { limit, offset, tags: tagIds.join(','), lang },
    signal,
  });
}

// CẦN BACKEND: GET /posts/featured?limit=9 trả bài theo thứ hạng tuần, kèm author{id,displayname,username,avatar_url,native}, tags[{id,name}] và comment_count.
/** Đọc bài nổi bật theo thứ hạng; chưa hỗ trợ thì giữ khung chờ dữ liệu trung tính. */
export async function getFeaturedPosts({ limit = 9 } = {}) {
  if (!backendSupports.featuredPosts) {
    return null;
  }
  return request('/posts/featured', { query: { limit } });
}

// CẦN BACKEND: GET /posts và GET /posts/{id} bổ sung comment_count, repost_count, like_count; dùng lại bài đã tải, không tạo endpoint thống kê riêng.
/** Đọc thống kê từ bài hoặc từ trang chi tiết khi chưa có bài truyền vào. */
export async function getPostStats(postId, post = null) {
  if (!backendSupports.postStats) {
    return null;
  }
  const source = post || await request('/posts/' + encodeURIComponent(postId));
  return {
    comment_count: source.comment_count ?? null,
    repost_count: source.repost_count ?? null,
    like_count: source.like_count ?? null,
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

// CẦN BACKEND: GET /posts/{id} trả place: { name, address, opening_hours, phone } cho bài có toạ độ (latitude/longitude đã có sẵn).
/**
 * Đọc thông tin địa điểm văn hoá của bài; null nghĩa là chưa biết, trang hiện thanh xám.
 * @param {object} post Bài đang đọc.
 * @returns {object|null} Thông tin địa điểm hoặc null khi backend chưa hỗ trợ.
 */
export function getPostPlace(post) {
  return backendSupports.postPlace && post?.place ? post.place : null;
}

/**
 * Đăng bài mới từ ô viết bài của Diễn đàn (cần JWT); backend tự nhận diện ngôn ngữ.
 * @param {object} draft { title, content } người dùng nhập.
 * @param {object} options tagIds là các mã chủ đề cần gắn trước khi báo người theo dõi.
 * @returns {Promise<object>} PostResponse kèm failedTagIds cục bộ để trang báo chủ đề chưa gắn được.
 */
export async function createPost({ title, content }, { tagIds = [] } = {}) {
  const post = await request('/posts', { method: 'POST', body: { title, content } });
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
  return { ...post, failedTagIds };
}

/**
 * Sửa bài của chính mình (tiêu đề bắt buộc). Gửi lại toạ độ cũ vì backend coi thiếu toạ độ là xoá địa điểm.
 * @param {string} postId Mã bài viết.
 * @param {object} changes { title, content, latitude, longitude }.
 * @returns {Promise<object>} Bài sau khi sửa.
 */
export function updatePost(postId, { title, content, latitude = null, longitude = null }) {
  return request('/posts/' + encodeURIComponent(postId), { method: 'PATCH', body: { title, content, latitude, longitude } });
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

// CẦN BACKEND: POST /uploads (multipart, field "file") trả { url, name, mime_type, size }; POST /posts nhận thêm attachments: [{ type: "image" | "file", url, name }] và GET /posts trả lại mảng này để PostCard hiện ảnh.
/**
 * Tải ảnh hoặc tệp đính kèm cho bài viết; null nghĩa là backend chưa hỗ trợ và trang không gửi yêu cầu.
 * @param {File} file Tệp người dùng chọn.
 * @returns {Promise<object|null>} Thông tin tệp đã tải lên hoặc null.
 */
export async function uploadAttachment(file) {
  if (!backendSupports.postAttachments) {
    return null;
  }
  // Lưu ý khi bật cờ: request() hiện luôn gửi JSON, cần thêm nhánh gửi FormData nguyên dạng trong client.js.
  const form = new FormData();
  form.append('file', file);
  return request('/uploads', { method: 'POST', body: form });
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

// CẦN BACKEND: các danh sách chưa trả displayname (theo dõi, gợi ý, tác giả nhúng) tạm hiện @username thật.
/** Nhãn trên giao diện phân biệt tên tự do với handle dự phòng; thiếu cả hai thì giữ chỗ. */
export function getAuthorLabel(author) {
  return author?.displayname ? getAuthorDisplayName(author)
    : author?.username ? getAuthorHandle(author) : undefined;
}
