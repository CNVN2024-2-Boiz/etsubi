/** Tập trung đường dẫn cho các trang Etsubi để header, footer và biểu mẫu dùng chung. */

// Dùng đường dẫn từ gốc để mọi trang hoạt động khi frontend được phục vụ tĩnh.
export const routes = Object.freeze({
  home: '/pages/index.html',
  forum: '/pages/forum.html',
  support: '/pages/support.html',
  about: '/pages/about.html',
  login: '/pages/profile/login.html',
  register: '/pages/profile/register.html',
  registerAdvanced: '/pages/profile/register-advanced.html',
  profile: '/pages/profile/index.html',
  search: '/pages/search.html',
  // Mã bài cần được mã hoá để không phá vỡ chuỗi tham số URL.
  post: id => '/pages/post.html?id=' + encodeURIComponent(id),
  newPost: '/pages/forum.html?compose=1',
});

/**
 * Tạo URL chia sẻ được cho trang tìm kiếm và liên kết từ chip thẻ.
 * @param {object} options Từ khoá q và mảng tên thẻ tags.
 * @returns {string} Đường dẫn với q và các tham số tag lặp lại.
 */
export function searchUrl({ q, tags = [] } = {}) {
  const params = new URLSearchParams();
  if (q?.trim()) {
    params.set('q', q.trim());
  }
  for (const tag of tags) {
    params.append('tag', tag);
  }
  return routes.search + (params.size ? '?' + params : '');
}

/**
 * Gắn trang quay lại vào liên kết đăng nhập, đăng ký hoặc đăng ký nâng cao.
 * @param {string} url Trang đích trong ứng dụng.
 * @param {string|null} back Trang muốn quay về, được kiểm tra khi thực sự chuyển hướng.
 * @returns {string} Đường dẫn giữ nguyên query và hash của trang đích.
 */
export function withRedirect(url, back) {
  const target = new URL(url, location.origin);
  if (back) {
    target.searchParams.set('redirect', back);
  }
  return target.pathname + target.search + target.hash;
}
