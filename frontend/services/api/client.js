/**
 * Cổng JSON dùng chung cho các trang xác thực và nội dung.
 * Gom yêu cầu vào hàng đợi để tuân thủ giới hạn của API Rust.
 */
const DEFAULT_API_BASE = "http://localhost:11432/api/v1";
const TOKEN_KEY = 'etsubi_token';

/**
 * Đọc bộ nhớ an toàn cho phiên đăng nhập và tuỳ chọn giao diện ở mọi trang.
 * @param {string} key Khoá cần đọc.
 * @param {boolean} session Dùng bộ nhớ phiên thay cho bộ nhớ lâu dài.
 * @returns {string|null} Giá trị đã lưu, hoặc null nếu bộ nhớ bị chặn.
 */
export function readStorage(key, session = false) {
  try {
    return (session ? sessionStorage : localStorage).getItem(key);
  } catch {
    // Trình duyệt có thể chặn bộ nhớ; trang vẫn phải mở được.
    return null;
  }
}

/**
 * Ghi hoặc xoá tuỳ chọn dùng chung cho các trang Etsubi.
 * @param {string} key Khoá lưu trữ.
 * @param {string|null} value Giá trị mới; null có nghĩa là xoá.
 * @param {boolean} session Chọn bộ nhớ phiên khi không cần lưu lâu dài.
 * @returns {void} Không trả về dữ liệu.
 */
export function writeStorage(key, value, session = false) {
  try {
    const storage = session ? sessionStorage : localStorage;
    if (value == null) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  } catch {
    // Bỏ qua lỗi bộ nhớ trong chế độ riêng tư hoặc môi trường hạn chế.
  }
}

/** Chọn API theo URL, bộ nhớ, cấu hình toàn cục rồi đến địa chỉ mặc định. */
function resolveBase() {
  const override = new URLSearchParams(location.search).get('api');
  let selected = null;
  if (override === 'reset') {
    writeStorage('etsubi_api_base', null);
  } else if (override) {
    // Chỉ nhận địa chỉ HTTP hợp lệ để cấu hình Docker không làm hỏng URL API.
    try {
      const url = new URL(override);
      if (['http:', 'https:'].includes(url.protocol)) {
        selected = url.href.replace(/[/]$/, '');
        writeStorage('etsubi_api_base', selected);
      }
    } catch {
      // Địa chỉ sai được bỏ qua để tiếp tục dùng cấu hình đã có.
    }
  }
  const base = selected || readStorage('etsubi_api_base') || window.ETSUBI_API_BASE || DEFAULT_API_BASE;
  return base.replace(/[/]$/, '');
}

// Địa chỉ này được dùng bởi mọi lời gọi API, giữ nguyên chuỗi mặc định cho Docker.
export const API_BASE = resolveBase();

/**
 * Lấy JWT cho các yêu cầu có xác thực trên mọi trang.
 * @returns {string|null} Token lâu dài hoặc token chỉ có trong phiên hiện tại.
 */
export function getToken() {
  return readStorage(TOKEN_KEY) || readStorage(TOKEN_KEY, true);
}

/**
 * Lưu JWT sau khi trang đăng nhập hoặc đăng ký thành công.
 * @param {string} token JWT từ API.
 * @param {object} options remember chọn lưu lâu dài theo ô ghi nhớ đăng nhập.
 * @returns {void} Không trả về dữ liệu.
 */
export function setToken(token, { remember = true } = {}) {
  // Xoá cả hai nơi trước để phiên cũ không được ưu tiên hơn phiên mới.
  clearToken();
  if (token) {
    // Không ghi nhớ thì dùng sessionStorage, đóng phiên trình duyệt sẽ mất token.
    writeStorage(TOKEN_KEY, token, !remember);
  }
}

/**
 * Xoá JWT khi đăng xuất hoặc hết phiên; mọi trang dùng chung thao tác này.
 * @returns {void} Không trả về dữ liệu.
 */
export function clearToken() {
  writeStorage(TOKEN_KEY, null);
  writeStorage(TOKEN_KEY, null, true);
}

/** Lỗi API thống nhất để các trang chọn thông báo và trường nhập cần đánh dấu. */
export class ApiError extends Error {
  /** Lưu mã HTTP, thông báo và dữ liệu gốc để lớp giao diện xử lý lỗi. */
  constructor(status, message, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Tách xử lý hết phiên khỏi lớp mạng để client không phụ thuộc giao diện trang.
const unauthorizedListeners = new Set();

/**
 * Đăng ký xử lý hết phiên cho tiện ích auth và các trang được bảo vệ.
 * @param {Function} callback Hàm chạy khi yêu cầu có token nhận 401.
 * @returns {Function} Hàm huỷ đăng ký.
 */
export function onUnauthorized(callback) {
  unauthorizedListeners.add(callback);
  return () => unauthorizedListeners.delete(callback);
}

// Tối đa ba yêu cầu đồng thời và cách nhau 250ms để tránh vượt giới hạn 4 lần/giây.
const queue = [];
let inFlight = 0;
let lastStart = 0;
let timer = null;

/** Lấy một công việc khỏi hàng đợi khi còn chỗ và đã đủ khoảng cách thời gian. */
function pump() {
  if (timer || inFlight >= 3 || !queue.length) {
    return;
  }
  const delay = Math.max(0, 250 - (Date.now() - lastStart));
  // Bộ hẹn giờ chỉ điều tiết mạng, không điều khiển animation giao diện.
  timer = setTimeout(() => {
    timer = null;
    const job = queue.shift();
    if (!job) {
      return;
    }
    if (job.signal?.aborted) {
      job.reject(job.signal.reason || new DOMException('Aborted', 'AbortError'));
      pump();
      return;
    }
    inFlight++;
    lastStart = Date.now();
    // Luôn giải phóng chỗ kể cả khi yêu cầu thất bại để hàng đợi không bị kẹt.
    Promise.resolve()
      .then(job.run)
      .then(job.resolve, job.reject)
      .finally(() => {
        inFlight--;
        pump();
      });
    pump();
  }, delay);
}

/** Xếp yêu cầu mạng và gỡ bộ lắng nghe huỷ khi yêu cầu kết thúc. */
function enqueue(run, signal) {
  return new Promise((resolve, reject) => {
    const job = { run, resolve, reject, signal };
    // Yêu cầu còn chờ được lấy ra ngay nếu trang không cần kết quả nữa.
    const abort = () => {
      const index = queue.indexOf(job);
      if (index >= 0) {
        queue.splice(index, 1);
      }
      reject(signal.reason || new DOMException('Aborted', 'AbortError'));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    // Dọn bộ lắng nghe ở cả hai nhánh để không giữ tham chiếu sau khi xong.
    job.resolve = value => {
      signal?.removeEventListener('abort', abort);
      resolve(value);
    };
    job.reject = error => {
      signal?.removeEventListener('abort', abort);
      reject(error);
    };
    queue.push(job);
    pump();
  });
}

/** Chờ trước lần thử lại, đồng thời cho phép trang huỷ thời gian chờ. */
function pause(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    // Bỏ lắng nghe khi hết thời gian để không xử lý huỷ sau khi đã hoàn tất.
    const done = () => {
      signal?.removeEventListener('abort', abort);
      resolve();
    };
    const timeout = setTimeout(done, milliseconds);
    // Huỷ phải dừng luôn bộ hẹn giờ để không còn công việc thừa.
    const abort = () => {
      clearTimeout(timeout);
      reject(signal.reason || new DOMException('Aborted', 'AbortError'));
    };
    if (signal?.aborted) {
      abort();
    } else {
      signal?.addEventListener('abort', abort, { once: true });
    }
  });
}

/**
 * Gửi JSON qua hàng đợi, dùng gián tiếp ở mọi trang thông qua các service.
 * @param {string} path Đường dẫn bắt đầu bằng dấu / bên dưới API_BASE.
 * @param {object} options Phương thức, body, query, tín hiệu huỷ và cờ auth.
 * @returns {Promise<object|string|null>} JSON, văn bản hoặc null nếu phản hồi rỗng.
 */
export async function request(path, { method = 'GET', body, query, signal, auth = true } = {}) {
  const url = new URL(API_BASE + path);
  // Chỉ thêm tham số có giá trị để API không nhận bộ lọc rỗng ngoài ý muốn.
  for (const [key, value] of Object.entries(query || {})) {
    if (value != null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  // Tối đa ba lần gửi: lần đầu và hai lần thử lại riêng cho lỗi quá giới hạn.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await enqueue(async () => {
        const token = auth ? getToken() : null;
        const headers = { Accept: 'application/json' };
        if (body !== undefined) {
          headers['Content-Type'] = 'application/json';
        }
        if (token) {
          headers.Authorization = 'Bearer ' + token;
        }
        let response;
        let raw;
        // Gộp huỷ từ trang với giới hạn 15 giây để biểu mẫu không chờ vô hạn.
        const controller = new AbortController();
        const abort = () => controller.abort(signal.reason);
        signal?.addEventListener('abort', abort, { once: true });
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          if (signal?.aborted) {
            abort();
          }
          response = await fetch(url, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: controller.signal,
          });
          raw = await response.text();
        } catch (error) {
          if (signal?.aborted) {
            throw signal.reason || error;
          }
          throw new ApiError(0, 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
        } finally {
          clearTimeout(timeout);
          signal?.removeEventListener('abort', abort);
        }
        // API có thể trả văn bản hoặc 204 rỗng, không phải phản hồi nào cũng là JSON.
        let data = null;
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
        }
        if (!response.ok) {
          // Chỉ xoá đúng token đã gửi; lỗi đăng nhập công khai không làm mất phiên khác.
          if (response.status === 401 && auth && token && token === getToken()) {
            clearToken();
            for (const callback of unauthorizedListeners) {
              callback();
            }
          }
          const message = data?.error || data?.message || (typeof data === 'string' && data) || ('Lỗi ' + response.status);
          throw new ApiError(response.status, message, data);
        }
        return data;
      }, signal);
    } catch (error) {
      if (error.status !== 429 || attempt === 2) {
        throw error;
      }
      // Chờ lâu hơn ở lần tiếp theo để máy chủ có thời gian phục hồi hạn mức.
      await pause(600 * (attempt + 1), signal);
    }
  }
}
