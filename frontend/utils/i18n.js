/**
 * Dịch giao diện VI/JA/EN.
 * Khoá dịch chính là câu tiếng Việt trong code, nên thiếu bản dịch thì trang vẫn hiện tiếng Việt.
 * Nội dung do người dùng viết không đi qua file này.
 */
import { getInterfaceLanguage, setInterfaceLanguage } from '/utils/preferences.js';
import { dictionary } from '/i18n/index.js';

// Ngôn ngữ được đọc một lần khi tải trang; đổi ngôn ngữ sẽ tải lại trang để mọi chữ đồng bộ.
const language = getInterfaceLanguage();
const locales = { vi: 'vi-VN', ja: 'ja-JP', en: 'en-US' };

/**
 * Cho biết ngôn ngữ giao diện của trang đang mở.
 * @returns {'vi'|'ja'|'en'} Mã ngôn ngữ.
 */
export function currentLanguage() {
  return language;
}

/**
 * Lấy mã vùng để định dạng ngày giờ và số theo ngôn ngữ giao diện.
 * @returns {string} Mã vùng như vi-VN.
 */
export function currentLocale() {
  return locales[language];
}

/** Chọn dạng số ít hoặc số nhiều khi bản dịch tiếng Anh khai báo { one, other }. */
function pickForm(entry, params) {
  if (typeof entry === 'string') {
    return entry;
  }
  return Number(params.count) === 1 ? entry.one : entry.other;
}

/**
 * Dịch một câu giao diện và điền các giá trị {ten} vào câu.
 * @param {string} source Câu tiếng Việt gốc, đồng thời là khoá dịch.
 * @param {object} params Giá trị cần điền vào câu.
 * @returns {string} Câu theo ngôn ngữ giao diện.
 */
export function t(source, params = {}) {
  const entry = language === 'vi' ? source : dictionary[source]?.[language] ?? source;
  return pickForm(entry, params).replace(/\{(\w+)\}/g, (match, name) => {
    return Object.hasOwn(params, name) ? String(params[name]) : match;
  });
}

/** Gộp khoảng trắng do xuống dòng trong HTML để câu khớp với khoá trong từ điển. */
function cleanText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Dịch phần chữ viết sẵn trong HTML theo các thuộc tính data-i18n.
 * @param {ParentNode} root Vùng cần dịch, mặc định là cả trang.
 */
export function translatePage(root = document) {
  // Tiếng Việt là bản gốc nên không cần thay chữ.
  if (language === 'vi') {
    return;
  }
  // data-i18n: phần tử chỉ chứa chữ thuần.
  for (const node of root.querySelectorAll('[data-i18n]')) {
    node.textContent = t(cleanText(node.textContent));
  }
  // data-i18n-html: câu có thẻ định dạng; bản dịch là chữ cố định trong dự án, không có dữ liệu API.
  for (const node of root.querySelectorAll('[data-i18n-html]')) {
    node.innerHTML = t(cleanText(node.innerHTML));
  }
  // data-i18n-attr: danh sách thuộc tính cần dịch, ví dụ "placeholder,aria-label".
  for (const node of root.querySelectorAll('[data-i18n-attr]')) {
    for (const name of node.dataset.i18nAttr.split(',')) {
      const attribute = name.trim();
      if (node.hasAttribute(attribute)) {
        node.setAttribute(attribute, t(cleanText(node.getAttribute(attribute))));
      }
    }
  }
  // Nội dung trong thẻ template chưa nằm trên trang nên phải dịch riêng trước khi được sao chép.
  for (const template of root.querySelectorAll('template')) {
    translatePage(template.content);
  }
}

/**
 * Lưu ngôn ngữ mới rồi tải lại trang để toàn bộ giao diện đổi theo.
 * @param {string} next Mã ngôn ngữ người dùng vừa chọn.
 */
export function changeInterfaceLanguage(next) {
  if (next === language) {
    return;
  }
  setInterfaceLanguage(next);
  location.reload();
}

// Module chạy sau khi HTML đã đọc xong nên có thể dịch ngay trước khi trang gắn sự kiện.
if (typeof document !== 'undefined' && document.documentElement && document.querySelectorAll) {
  document.documentElement.lang = language;
  translatePage();
}
