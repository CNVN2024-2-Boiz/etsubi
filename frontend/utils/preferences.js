/**
 * Tuỳ chọn giao diện lưu trong trình duyệt (ngôn ngữ giao diện, chế độ hiển thị).
 * Header và trang Cài đặt cùng đọc/ghi ở đây để hai nơi luôn khớp nhau.
 */
import { readStorage, writeStorage } from '/services/api/client.js';

// Khoá lưu trữ dùng chung; header đã dùng etsubi_lang từ batch 1 nên giữ nguyên tên.
const LANGUAGE_KEY = 'etsubi_lang';
const THEME_KEY = 'etsubi_theme';

// Tên sự kiện báo cho các phần khác trên cùng trang khi tuỳ chọn thay đổi.
export const LANGUAGE_EVENT = 'etsubi:language-change';
export const THEME_EVENT = 'etsubi:theme-change';

// Danh sách giá trị hợp lệ, theo thứ tự hiển thị trên nút chọn.
export const INTERFACE_LANGUAGES = Object.freeze(['vi', 'ja', 'en']);
export const THEMES = Object.freeze(['light', 'dark', 'system']);

// Chỉ chế độ Sáng có bảng màu; Tối và Theo máy chờ thiết kế nên chưa áp dụng được.
export const SUPPORTED_THEMES = Object.freeze(['light']);

/**
 * Đọc ngôn ngữ giao diện đã chọn, giá trị lạ hoặc thiếu thì dùng tiếng Việt.
 * @returns {'vi'|'ja'|'en'} Mã ngôn ngữ.
 */
export function getInterfaceLanguage() {
  const value = readStorage(LANGUAGE_KEY);
  return INTERFACE_LANGUAGES.includes(value) ? value : 'vi';
}

/**
 * Lưu ngôn ngữ giao diện rồi phát sự kiện để header và trang Cài đặt cập nhật ngay.
 * @param {string} language Mã ngôn ngữ cần lưu.
 * @returns {string} Mã ngôn ngữ thực sự được lưu.
 */
export function setInterfaceLanguage(language) {
  const value = INTERFACE_LANGUAGES.includes(language) ? language : 'vi';
  writeStorage(LANGUAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: { language: value } }));
  return value;
}

/**
 * Đọc chế độ hiển thị đã chọn; mặc định là Sáng.
 * @returns {'light'|'dark'|'system'} Chế độ đã lưu.
 */
export function getThemePreference() {
  const value = readStorage(THEME_KEY);
  return THEMES.includes(value) ? value : 'light';
}

/**
 * Lưu chế độ hiển thị. Hiện chỉ lưu lựa chọn, chưa đổi màu trang vì chưa có bảng màu tối.
 * @param {string} theme Chế độ cần lưu.
 * @returns {string} Chế độ thực sự được lưu.
 */
export function setThemePreference(theme) {
  const value = THEMES.includes(theme) ? theme : 'light';
  writeStorage(THEME_KEY, value);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme: value } }));
  return value;
}

/**
 * Gọi lại hàm khi ngôn ngữ đổi, kể cả khi đổi ở tab khác (sự kiện storage).
 * @param {(language: string) => void} callback Hàm nhận mã ngôn ngữ mới.
 * @param {AbortSignal} [signal] Huỷ lắng nghe khi thành phần bị gỡ.
 */
export function onInterfaceLanguageChange(callback, signal) {
  window.addEventListener(LANGUAGE_EVENT, event => callback(event.detail.language), { signal });
  window.addEventListener('storage', event => {
    if (event.key === LANGUAGE_KEY) {
      callback(getInterfaceLanguage());
    }
  }, { signal });
}
