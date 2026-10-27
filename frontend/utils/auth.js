import { request } from '../services/api/client.js';

export const LOGIN_URL = '/pages/profile/login.html';
export const REGISTER_URL = '/pages/profile/register.html';
export const HOME_URL = '/pages/index.html';

// Cache user trong RAM của trang hiện tại (mỗi lần tải trang sẽ gọi /my lại)
let cachedUser = null;

// Chỉ cho phép redirect nội bộ (chống open redirect)
export function safeRedirect(target, fallback = HOME_URL) {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : fallback;
}

export const auth = {
  async register(username, email, password) {
    return request('/auth/register', { method: 'POST', body: { username, email, password } });
  },

  async login(email, password) {
    await request('/auth/login', { method: 'POST', body: { email, password } });
    const user = await this.fetchCurrentUser();
    if (!user) {
      throw new Error(
        'Đăng nhập thành công nhưng trình duyệt chưa nhận được cookie. ' +
        'Kiểm tra backend đã Set-Cookie, CORS supports_credentials, và frontend/backend dùng cùng host (localhost).'
      );
    }
    return user;
  },

  async logout() {
    try { await request('/auth/logout', { method: 'POST' }); } catch (e) { console.error(e); }
    cachedUser = null;
    window.location.href = HOME_URL;
  },

  // Trả về user hoặc null nếu chưa đăng nhập / cookie hết hạn
  async fetchCurrentUser() {
    try {
      const u = await request('/my');
      cachedUser = {
        id: u.id,
        username: u.username,
        role: u.role,
        status: u.status,
        mutedUntil: u.muted_until ?? null, // /my hiện chưa trả field này; có thì dùng
        isAdmin: u.role === 'admin',
        isStaff: u.role === 'admin' || u.role === 'moderator',
      };
    } catch {
      cachedUser = null;
    }
    return cachedUser;
  },

  getUser() {
    return cachedUser;
  },

  // Chạy action nếu đã đăng nhập, ngược lại chuyển sang trang login rồi quay lại trang hiện tại
  async requireAuth(action) {
    if (!cachedUser) await this.fetchCurrentUser();

    if (cachedUser) {
      if (typeof action === 'function') await action(cachedUser);
      return true;
    }

    const back = encodeURIComponent(location.pathname + location.search);
    window.location.href = `${LOGIN_URL}?redirect=${back}`;
    return false;
  },
};
