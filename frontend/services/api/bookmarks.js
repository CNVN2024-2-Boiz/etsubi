/** Thao tác lưu bài đã có API; trang kiểm tra đăng nhập trước khi gọi. */
import { request } from '/services/api/client.js';
import { backendSupports } from '/services/api/capabilities.js';

/** Lưu bài cho người đang đăng nhập qua endpoint hiện có. */
export function bookmarkPost(postId) {
  return request('/posts/' + encodeURIComponent(postId) + '/bookmark', { method: 'POST' });
}

/** Bỏ lưu bài sau khi người dùng đã xác nhận trạng thái bằng thao tác lưu trong phiên. */
export function unbookmarkPost(postId) {
  return request('/posts/' + encodeURIComponent(postId) + '/bookmark', { method: 'DELETE' });
}

// CẦN BACKEND: GET /posts trả is_bookmarked theo người xem có JWT; chưa hỗ trợ thì null, không gọi thêm endpoint để đoán trạng thái.
/** Đọc trạng thái từ bài đã tải; null nghĩa là chưa biết, không phải chưa lưu. */
export async function getBookmarkState(post) {
  return backendSupports.bookmarkState && typeof post.is_bookmarked === 'boolean'
    ? post.is_bookmarked : null;
}
