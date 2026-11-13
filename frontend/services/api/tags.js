/** Danh mục thẻ dùng chung, chuyển tên trong URL tìm kiếm sang mã UUID của API. */
import { request } from '/services/api/client.js';

// Chia sẻ yêu cầu danh mục vì bộ thẻ cố định và API có giới hạn tần suất.
let cachedTags;

/**
 * Đọc danh mục thẻ cho trang tìm kiếm và các chip thẻ.
 * @returns {Promise<Array>} Danh sách thẻ có id và name.
 */
export function listTags() {
  if (!cachedTags) {
    // Khi lỗi cần bỏ bộ nhớ để người dùng có thể thử tải lại.
    cachedTags = request('/tags').catch(error => {
      cachedTags = null;
      throw error;
    });
  }
  return cachedTags;
}

/**
 * Đổi tên thẻ từ URL trang tìm kiếm thành mã gửi API, loại tên lặp và không có.
 * @param {Array<string>} names Danh sách tên thẻ được chọn.
 * @returns {Promise<Array<string>>} Mã UUID tương ứng.
 */
export async function tagIdsFromNames(names = []) {
  const tags = await listTags();
  const ids = [];
  for (const name of new Set(names)) {
    const tag = tags.find(item => item.name === name);
    if (tag?.id) {
      ids.push(tag.id);
    }
  }
  return ids;
}

/**
 * Đổi mã thẻ của API thành tên hiển thị trên trang nội dung và tìm kiếm.
 * @param {string} id UUID cần tìm.
 * @returns {Promise<string|null>} Tên thẻ hoặc null khi không tồn tại.
 */
export async function tagNameFromId(id) {
  const tags = await listTags();
  const tag = tags.find(item => item.id === id);
  return tag?.name ?? null;
}
