/** Đọc thống kê cảm xúc thật để số lượt thích của bảng tin không phải dữ liệu giả. */
import { request } from '/services/api/client.js';

/** Lấy từng loại cảm xúc và số lượng; trang cộng count tuần tự sau tác giả và tag. */
export function getReactionSummary(postId) {
  return request('/posts/' + encodeURIComponent(postId) + '/reactions/summary');
}
