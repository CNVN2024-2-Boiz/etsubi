/** Gợi ý cá nhân chỉ được tải khi backend đã hỗ trợ hợp đồng của Trang chủ. */
import { request } from '/services/api/client.js';
import { backendSupports } from '/services/api/capabilities.js';

// CẦN BACKEND: GET /my/recommendations có xác thực trả topics[{id,name}], posts[{id,title,comment_count,tag:{id,name}}], members[{id,username,avatar_url,institute,address}]; users cần lưu chủ đề quan tâm.
/** Lấy gợi ý theo chủ đề đăng ký; trả null và không gửi yêu cầu khi chưa hỗ trợ. */
export async function getMyRecommendations() {
  if (!backendSupports.recommendations) {
    return null;
  }
  return request('/my/recommendations');
}
