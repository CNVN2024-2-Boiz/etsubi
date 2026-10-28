// Cấu hình + hàm gọi API dùng chung.
// Override qua window.ETSUBI_API_BASE nếu cần trỏ sang BE khác.
export const API_BASE =
  window.ETSUBI_API_BASE || "http://localhost:11432/api/v1";

const TOKEN_KEY = "etsubi_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* bỏ qua */
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function request(path, { method = "GET", body } = {}) {
  const hasBody = body !== undefined;
  const headers = {};
  if (hasBody) headers["Content-Type"] = "application/json";

  // Backend dùng JWT Bearer, không dùng cookie.
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "Không kết nối được máy chủ. Kiểm tra backend và CORS.",
    );
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data && data.error) ||
      (typeof data === "string" && data) ||
      `Lỗi ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return data;
}
