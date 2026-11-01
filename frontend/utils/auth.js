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
  async register(username, email, password, language = "vi") {
    return request("/auth/register", {
      method: "POST",
      body: { username, email, password, language },
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

  async logout() {
    // Invalidate all tokens server-side; ignore network failure.
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
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
        email: u.email,
        role: u.role,
        status: u.status,
        language: u.language,
        mutedUntil: u.muted_until ?? null,
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

  isMuted() {
    if (!cachedUser || !cachedUser.mutedUntil) return false;
    return new Date(cachedUser.mutedUntil).getTime() > Date.now();
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
