// Cấu hình + hàm gọi API dùng chung. Mọi request đều kèm cookie (credentials: 'include').
// Đổi cổng backend: đặt window.ETSUBI_API_BASE trước khi import, hoặc sửa dòng dưới.
export const API_BASE = window.ETSUBI_API_BASE || 'http://localhost:11437/api/v1';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function request(path, { method = 'GET', body } = {}) {
  const hasBody = body !== undefined;
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      // Chỉ gửi Content-Type khi có body, tránh preflight CORS thừa cho GET
      headers: hasBody ? { 'Content-Type': 'application/json' } : {},
      body: hasBody ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra backend và CORS.');
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    // Backend trả {"error": "..."} hoặc text thuần (lỗi từ middleware)
    const msg = (data && data.error) || (typeof data === 'string' && data) || `Lỗi ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return data;
}
