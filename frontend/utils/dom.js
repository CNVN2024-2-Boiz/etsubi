/** Tiện ích DOM an toàn dùng bởi header, footer và các trang có dữ liệu động. */

/**
 * Mã hoá văn bản trước khi dùng trong chuỗi HTML ở các trang nội dung.
 * @param {*} value Giá trị cần hiển thị.
 * @returns {string} Chuỗi đã thay các ký tự đặc biệt bằng thực thể HTML.
 */
export function escapeHtml(value) {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
}

/**
 * Chọn một phần tử theo hook dữ liệu hoặc id trong mọi trang và component.
 * @param {string} selector Bộ chọn CSS.
 * @param {ParentNode} root Gốc tìm kiếm, mặc định là document.
 * @returns {Element|null} Phần tử đầu tiên tìm được.
 */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Lấy mảng phần tử để duyệt các trường biểu mẫu hoặc nút của component.
 * @param {string} selector Bộ chọn CSS.
 * @param {ParentNode} root Gốc tìm kiếm.
 * @returns {Array<Element>} Mảng các phần tử khớp bộ chọn.
 */
export function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

/**
 * Tạo phần tử bằng DOM cho header, footer và các trang, không chèn HTML động.
 * @param {string} tag Tên thẻ HTML.
 * @param {object} attrs Thuộc tính; className dùng để gán lớp CSS.
 * @param {...*} children Nút DOM, văn bản hoặc mảng con.
 * @returns {HTMLElement} Phần tử vừa tạo.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  // Bỏ giá trị rỗng; thuộc tính boolean true được biểu diễn bằng chuỗi rỗng.
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) {
      continue;
    }
    if (key === 'className') {
      node.className = value;
    } else {
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }
  // Văn bản được tạo thành text node nên dữ liệu API không thể trở thành mã HTML.
  for (const child of children.flat(Infinity)) {
    if (child != null && child !== false) {
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  }
  return node;
}
