/** Tập trung đường dẫn cho các trang Etsubi để header, footer và biểu mẫu dùng chung. */

// Dùng đường dẫn từ gốc để mọi trang hoạt động khi frontend được phục vụ tĩnh.
export const routes = Object.freeze({
  home: '/',
  forum: '/forum/',
  support: '/support/',
  // Hai văn bản pháp lý dùng URL thư mục.
  terms: '/terms/',
  privacy: '/privacy/',
  about: '/about/',
  login: '/login/',
  register: '/register/',
  registerAdvanced: '/register-advanced/',
  profile: '/profile/',
  // Trang Cài đặt gộp Chỉnh sửa hồ sơ, Giao diện và Phiên đăng nhập.
  settings: '/settings/',
  // Trang cũ chỉ còn chuyển hướng sang Cài đặt; giữ khoá để liên kết cũ không gãy.
  profileEdit: '/settings/',
  // Mã thành viên được mã hoá để liên kết thông báo mở đúng hồ sơ công khai.
  userProfile: id => '/profile/?id=' + encodeURIComponent(id),
  search: '/search/',
  // Trang thông báo riêng phục vụ điện thoại và liên kết truy cập trực tiếp.
  notifications: '/notifications/',
  // Mã bài cần được mã hoá để không phá vỡ chuỗi tham số URL.
  post: id => '/post/?id=' + encodeURIComponent(id),
  newPost: '/forum/?compose=1',
});

// Ánh xạ địa chỉ đã phát hành để đổi cả liên kết cũ lẫn tham số quay lại.
const legacyPaths = new Map([
  ['/pages/', '/'],
  ['/pages/profile/', '/profile/'],
  ['/pages/index.html', '/'],
  ['/pages/forum.html', '/forum/'],
  ['/pages/post.html', '/post/'],
  ['/pages/search.html', '/search/'],
  ['/pages/support.html', '/support/'],
  ['/pages/about.html', '/about/'],
  ['/pages/settings.html', '/settings/'],
  ['/pages/notifications.html', '/notifications/'],
  ['/pages/profile/index.html', '/profile/'],
  ['/pages/profile/login.html', '/login/'],
  ['/pages/profile/register.html', '/register/'],
  ['/pages/profile/register-advanced.html', '/register-advanced/'],
  ['/pages/profile/edit.html', '/settings/'],
]);

/** Giữ nguyên query và hash khi đổi một đường dẫn HTML cũ sang địa chỉ mới. */
export function cleanUrlPath(url) {
  return (legacyPaths.get(url.pathname) ?? url.pathname) + url.search + url.hash;
}

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
