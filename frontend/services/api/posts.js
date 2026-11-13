/**
 * Điểm truy cập bài viết cho trang tìm kiếm.
 * Khi có WebSocket, chỉ cần đổi lớp vận chuyển tại đây thay vì sửa trang.
 */
import { request } from '/services/api/client.js';
import { backendSupports } from '/services/api/capabilities.js';

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

// CẦN BACKEND: GET /posts?sort=popular xếp theo độ phổ biến; GET /posts?lang=vi trả title/content đã dịch, original_language và is_translated. Cờ tắt trả null cho tuỳ chọn chưa hỗ trợ, không gửi yêu cầu.
/** Lấy bài mới hoặc hỏi đáp thật; chỉ thêm sort và lang khi backend đã hỗ trợ. */
export async function listPosts({ limit = 5, offset = 0, tagIds = [], sort = 'newest', lang, signal } = {}) {
  if ((sort === 'popular' && !backendSupports.popularSort)
    || (lang && !backendSupports.autoTranslateFeed)) {
    return null;
  }
  return request('/posts', {
    query: { limit, offset, tags: tagIds.join(','), sort: sort === 'popular' ? sort : undefined, lang },
    signal,
  });
}

// CẦN BACKEND: GET /posts/featured?limit=9 trả bài theo thứ hạng tuần, kèm author{id,username,avatar_url,native}, tags[{id,name}] và comment_count.
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

// CẦN BACKEND: GET /my/feed?limit=&offset= có xác thực trả danh sách bài từ người đang theo dõi, cùng cấu trúc GET /posts.
/** Lấy bảng tin theo dõi khi backend hỗ trợ; không gửi yêu cầu tới đường dẫn chưa có. */
export async function listFollowingFeed({ limit = 5, offset = 0, signal } = {}) {
  if (!backendSupports.followingFeed) {
    return null;
  }
  return request('/my/feed', { query: { limit, offset }, signal });
}

// CẦN BACKEND: users có display_name riêng với username là @handle duy nhất; tác giả nhúng cũng cần display_name. Chưa có thì dùng username thật ở cả hai vị trí.
/** Chọn tên hiển thị thật từ hồ sơ đã tải, không phát sinh yêu cầu hồ sơ bổ sung. */
export function getAuthorDisplayName(author) {
  return backendSupports.userHandle ? author?.display_name || author?.username : author?.username;
}
