/** Quản lý phiên dùng chung cho biểu mẫu xác thực, header và các trang cần đăng nhập. */
import * as api from '/services/api/auth.js';
import { getMe } from '/services/api/users.js';
import { getToken, setToken, clearToken, onUnauthorized, ApiError } from '/services/api/client.js';
import { routes, withRedirect } from '/utils/routes.js';

// Giữ các tên cũ để những trang đang dùng tiện ích auth không bị đứt liên kết.
export const LOGIN_URL = routes.login;
export const REGISTER_URL = routes.register;
export const HOME_URL = routes.home;

// Hồ sơ chỉ hợp lệ với token đã tải nó; pending chia sẻ lần tải đang thực hiện.
let cachedUser = null;
let cachedToken = null;
let pending = null;

/** Chuẩn hoá tên thuộc tính API để header và các trang dùng cùng cấu trúc hồ sơ. */
function normalize(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    native: user.native,
    language: user.language,
    institute: user.institute ?? null,
    address: user.address ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatar_url ?? null,
    mutedUntil: user.muted_until ?? null,
    isStaff: ['admin', 'moderator'].includes(user.role),
    isAdmin: user.role === 'admin',
  };
}

/**
 * Kiểm tra trang quay lại sau đăng nhập hoặc đăng ký để tránh chuyển sang trang lạ.
 * @param {string|null} target Đường dẫn lấy từ tham số redirect.
 * @param {string} fallback Trang nội bộ mặc định khi đường dẫn không hợp lệ.
 * @returns {string} Đường dẫn cùng nguồn, gồm query và hash.
 */
export function safeRedirect(target, fallback = routes.home) {
  // Chặn URL tuyệt đối, hai dấu /, dấu gạch ngược và ký tự điều khiển trước khi phân tích.
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//') || /[\\\u0000-\u0020]/u.test(target)) {
    return fallback;
  }
  try {
    const url = new URL(target, location.origin);
    return url.origin === location.origin ? url.pathname + url.search + url.hash : fallback;
  } catch {
    return fallback;
  }
}

/** Nhận diện biểu mẫu xác thực để lỗi phiên cũ không làm tải lại chính biểu mẫu. */
function isAuthPage() {
  return [routes.login, routes.register].includes(location.pathname);
}

// Khi yêu cầu bảo vệ nhận 401, xoá hồ sơ và giữ trang hiện tại trong liên kết đăng nhập.
onUnauthorized(() => {
  cachedUser = null;
  cachedToken = null;
  if (!isAuthPage()) {
    location.assign(withRedirect(routes.login, location.pathname + location.search + location.hash));
  }
});

/**
 * Đọc hồ sơ đã tải cho header và các trang mà không gọi thêm API.
 * @returns {object|null} Hồ sơ nếu vẫn thuộc token hiện tại.
 */
export function getCachedUser() {
  return cachedToken === getToken() ? cachedUser : null;
}

/**
 * Tải phiên hiện tại cho header và trang xác thực, chia sẻ yêu cầu đang chờ.
 * @returns {Promise<object|null>} Hồ sơ chuẩn hoá hoặc null nếu không có phiên hợp lệ.
 */
export async function fetchCurrentUser() {
  const token = getToken();
  if (!token) {
    cachedUser = null;
    cachedToken = null;
    return null;
  }
  if (pending?.token === token) {
    return pending.promise;
  }
  // Không dùng kết quả của token cũ nếu người dùng đã đổi phiên trong lúc tải.
  const promise = getMe()
    .then(user => {
      if (getToken() !== token) {
        return null;
      }
      cachedToken = token;
      cachedUser = normalize(user);
      return cachedUser;
    })
    .catch(error => {
      if (getToken() === token) {
        cachedUser = null;
        cachedToken = null;
        if (error.status === 401 || error.status === 403) {
          clearToken();
        }
      }
      return null;
    })
    .finally(() => {
      if (pending?.promise === promise) {
        pending = null;
      }
    });
  pending = { token, promise };
  return promise;
}

/**
 * Đăng nhập rồi tải hồ sơ cho trang login và bước tự đăng nhập sau đăng ký.
 * @param {string} email Email tài khoản.
 * @param {string} password Mật khẩu nguyên gốc.
 * @param {object} options remember chọn cách lưu token.
 * @returns {Promise<object>} Hồ sơ đã chuẩn hoá.
 */
export async function login(email, password, { remember = true } = {}) {
  const result = await api.login({ email, password });
  if (!result?.token) {
    throw new ApiError(502, 'Máy chủ không trả về phiên đăng nhập.');
  }
  setToken(result.token, { remember });
  try {
    cachedUser = normalize(await getMe());
    cachedToken = result.token;
    return cachedUser;
  } catch (error) {
    // Không giữ phiên nửa chừng nếu không đọc được hồ sơ sau khi nhận JWT.
    clearToken();
    cachedUser = null;
    cachedToken = null;
    throw error;
  }
}

/**
 * Tạo tài khoản rồi đăng nhập cho trang register trước bước bổ sung hồ sơ.
 * @param {object} details Thông tin đăng ký gửi tới API.
 * @param {object} options remember chọn cách lưu phiên mới.
 * @returns {Promise<object>} Hồ sơ đăng nhập thành công.
 */
export async function registerAndLogin(details, { remember = true } = {}) {
  await api.register(details);
  try {
    return await login(details.email, details.password, { remember });
  } catch (error) {
    // Tài khoản đã tạo: lần gửi lại chỉ cần đăng nhập, không đăng ký trùng email.
    error.accountCreated = true;
    throw error;
  }
}

/**
 * Đăng xuất từ header hoặc thông báo phiên trên trang xác thực.
 * @returns {Promise<void>} Xoá phiên và chuyển về trang chủ kể cả khi mất mạng.
 */
export async function logout() {
  try {
    if (getToken()) {
      await api.logout();
    }
  } catch {
    // Đăng xuất cục bộ vẫn thực hiện được khi máy chủ không phản hồi.
  } finally {
    clearToken();
    cachedUser = null;
    cachedToken = null;
    location.assign(routes.home);
  }
}

/**
 * Kiểm tra phiên trước thao tác cần đăng nhập trên các trang nội dung.
 * @param {Function} action Thao tác tuỳ chọn nhận hồ sơ khi có phiên hợp lệ.
 * @returns {Promise<boolean>} true khi có phiên, false khi chuyển sang đăng nhập.
 */
export async function requireAuth(action) {
  const user = getCachedUser() || await fetchCurrentUser();
  if (user) {
    if (typeof action === 'function') {
      await action(user);
    }
    return true;
  }
  location.assign(withRedirect(routes.login, location.pathname + location.search + location.hash));
  return false;
}

// Giữ giao diện tiện ích cũ cho các trang chưa chuyển sang import từng hàm.
export const auth = {
  login,
  logout,
  fetchCurrentUser,
  requireAuth,
  getUser: getCachedUser,
  /** Gửi đăng ký kiểu cũ, mặc định tiếng mẹ đẻ là tiếng Việt. */
  register(username, email, password, language = 'vi') {
    return api.register({ username, email, password, native: 'vi', language });
  },
  /** Kiểm tra thời hạn cấm viết để trang nội dung quyết định hiện thông báo. */
  isMuted() {
    const user = getCachedUser();
    return Boolean(user?.mutedUntil && new Date(user.mutedUntil).getTime() > Date.now());
  },
};
