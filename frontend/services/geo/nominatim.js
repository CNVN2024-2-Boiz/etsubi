/** Nominatim công khai: hàng đợi toàn module cách ít nhất một giây, cache để tránh gọi lặp. */
import { requestExternal, readStorage, writeStorage } from '/services/api/client.js';

const cache = new Map();
let tail = Promise.resolve();
let lastStart = 0;

/** Chờ đến lượt; yêu cầu đã huỷ không được phát ra mạng hoặc làm hỏng hàng đợi tiếp theo. */
function queued(url, signal) {
  const job = tail.then(async () => {
    if (signal?.aborted) throw signal.reason;
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 1000 - (Date.now() - lastStart))));
    if (signal?.aborted) throw signal.reason;
    if (cache.has(url)) return cache.get(url);
    lastStart = Date.now();
    const result = await requestExternal(url, { signal });
    cache.set(url, result);
    return result;
  });
  tail = job.catch(() => {});
  return job;
}

/** Chuyển phản hồi Nominatim về hợp đồng địa điểm nhỏ mà hai editor dùng chung. */
function normalize(item) {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { name: item.name || item.display_name?.split(',')[0] || 'Vị trí đã chọn',
    address: String(item.display_name || '').split(',').slice(0, 4).join(',').trim(),
    latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) };
}

/** Tìm theo một query đã chốt; caller chịu debounce và không gửi từng phím gõ. */
export async function searchPlaces(query, { signal } = {}) {
  const q = String(query).trim();
  if (q.length < 3) return [];
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ format: 'jsonv2', q, limit: '5', 'accept-language': 'vi' });
  const data = await queued(url.href, signal);
  return Array.isArray(data) ? data.map(normalize).filter(Boolean) : [];
}

/** Đọc tên/địa chỉ theo ghim; cache phiên giúp Reading không lặp reverse sau mỗi lần mở bài. */
export async function reversePlace(latitude, longitude, { signal } = {}) {
  const lat = Number(latitude).toFixed(6);
  const lon = Number(longitude).toFixed(6);
  const key = 'etsubi_place_' + lat + ',' + lon;
  const saved = readStorage(key, true);
  try {
    const parsed = saved && JSON.parse(saved);
    if (parsed && typeof parsed.name === 'string' && typeof parsed.address === 'string'
      && parsed.latitude === Number(lat) && parsed.longitude === Number(lon)) return parsed;
  } catch {
    // Bộ nhớ lỗi thì tra lại dịch vụ, không làm trang đọc bị hỏng.
  }
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.search = new URLSearchParams({ format: 'jsonv2', lat, lon, zoom: '18', 'accept-language': 'vi' });
  const found = normalize(await queued(url.href, signal));
  // Reverse trả tâm đối tượng OSM; cache phải giữ toạ độ ghim gốc để lần đọc sau khớp đúng khoá.
  const result = found ? { ...found, latitude: Number(lat), longitude: Number(lon) } : null;
  if (result) writeStorage(key, JSON.stringify(result), true);
  return result;
}
