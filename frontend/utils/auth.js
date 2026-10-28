import { request, getToken, setToken } from "../services/api/client.js";

export const LOGIN_URL = "/pages/profile/login.html";
export const REGISTER_URL = "/pages/profile/register.html";
export const HOME_URL = "/pages/index.html";

let cachedUser = null;

export function safeRedirect(target, fallback = HOME_URL) {
  return target && target.startsWith("/") && !target.startsWith("//")
    ? target
    : fallback;
}

export const auth = {
  async register(username, email, password) {
    return request("/auth/register", {
      method: "POST",
      body: { username, email, password },
    });
  },

  async login(email, password) {
    const res = await request("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (!res || !res.token) throw new Error("Server không trả token.");
    setToken(res.token);
    const user = await this.fetchCurrentUser();
    if (!user) {
      setToken(null);
      throw new Error(
        "Đăng nhập xong nhưng không lấy được /my. Kiểm tra JWT_KEY backend.",
      );
    }
    return user;
  },

  logout() {
    // BE không có endpoint logout (JWT stateless) → chỉ xoá token ở FE.
    setToken(null);
    cachedUser = null;
    window.location.href = HOME_URL;
  },

  async fetchCurrentUser() {
    if (!getToken()) {
      cachedUser = null;
      return null;
    }
    try {
      const u = await request("/my");
      cachedUser = {
        id: u.id,
        username: u.username,
        role: u.role,
        status: u.status,
        // GetUserResponse không trả muted_until → để null.
        mutedUntil: null,
        isAdmin: u.role === "admin",
        isStaff: u.role === "admin" || u.role === "moderator",
      };
    } catch (e) {
      if (e.status === 401 || e.status === 403) setToken(null);
      cachedUser = null;
    }
    return cachedUser;
  },

  getUser() {
    return cachedUser;
  },

  async requireAuth(action) {
    if (!cachedUser) await this.fetchCurrentUser();
    if (cachedUser) {
      if (typeof action === "function") await action(cachedUser);
      return true;
    }
    const back = encodeURIComponent(location.pathname + location.search);
    window.location.href = `${LOGIN_URL}?redirect=${back}`;
    return false;
  },
};
