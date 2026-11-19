/** Nhắc tên bằng @username: nhận diện trong nội dung, gợi ý khi soạn và tô tên sau khi đăng. */
import { renderRichContent, richTextOutsideLinks } from '/utils/rich-text.js';
import { t } from '/utils/i18n.js';

// Máy chủ chỉ nhận tối đa 10 tên trong một lần gửi thông báo.
export const MENTION_LIMIT = 10;

// @ phải đứng đầu từ, theo sau là 3-30 ký tự a-z, 0-9 hoặc _. Dấu chấm cuối câu vẫn hợp lệ,
// còn dấu chấm nối tiếp chữ (tên miền, tên cũ) thì không; chữ Nhật viết liền sau tên được coi là ranh giới.
const MENTION_PATTERN = /(?<![\p{Script=Latin}\p{N}_@./-])@([a-z0-9_]{3,30})(?![\p{Script=Latin}\p{N}_]|\.[\p{Script=Latin}\p{N}_])/gu;

/**
 * Tách một đoạn chữ thành các phần thường và phần là tên được nhắc.
 * @param {string} text Đoạn chữ thuần.
 * @returns {Array<{text: string, mention: boolean}>} Các phần theo đúng thứ tự, ghép lại bằng chuỗi gốc.
 */
export function splitMentions(text) {
  const value = String(text ?? '');
  const parts = [];
  let cursor = 0;
  for (const match of value.matchAll(MENTION_PATTERN)) {
    if (match.index > cursor) parts.push({ text: value.slice(cursor, match.index), mention: false });
    parts.push({ text: match[0], mention: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) parts.push({ text: value.slice(cursor), mention: false });
  return parts;
}

/**
 * Lấy danh sách username được nhắc trong nội dung, bỏ trùng và bỏ qua chữ nằm trong liên kết.
 * @param {string} html Nội dung bài viết hoặc bình luận.
 * @returns {string[]} Username không kèm @, theo thứ tự xuất hiện.
 */
export function listMentions(html) {
  const names = new Set();
  for (const piece of richTextOutsideLinks(html)) {
    for (const part of splitMentions(piece)) {
      if (part.mention) names.add(part.text.slice(1));
    }
  }
  return [...names];
}

/**
 * Chọn dòng gợi ý dưới khung soạn; chỉ nhắc cú pháp vì chưa xác nhận được người dùng có tồn tại.
 * @param {string} html Nội dung đang soạn.
 * @returns {{text: string, warning: boolean}} Câu hiển thị và cờ cảnh báo khi quá giới hạn.
 */
export function mentionHint(html) {
  const count = listMentions(html).length;
  return count > MENTION_LIMIT
    ? { text: t('Chỉ {limit} tên đầu tiên được gửi thông báo (đang có {count} tên)', { limit: MENTION_LIMIT, count }), warning: true }
    : { text: t('Gõ @username để nhắc đến ai đó'), warning: false };
}

/**
 * Tô các tên được nhắc trong phần nội dung đã đăng, không đụng tới chữ nằm trong liên kết.
 * @param {Node} root Phần tử hoặc fragment chứa nội dung đã dựng an toàn.
 * @returns {Node} Chính nút đã truyền vào để tiện gắn tiếp.
 */
export function markMentions(root) {
  const doc = root.ownerDocument || document;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  // Thu thập trước khi thay thế để nút span mới không bị bộ duyệt đọc lại.
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    if (node.parentElement?.closest('a, .rich-content__mention')) continue;
    const parts = splitMentions(node.textContent);
    if (!parts.some(part => part.mention)) continue;
    const replacement = doc.createDocumentFragment();
    for (const part of parts) {
      if (!part.mention) { replacement.append(part.text); continue; }
      const span = doc.createElement('span');
      span.className = 'rich-content__mention';
      span.textContent = part.text;
      replacement.append(span);
    }
    node.replaceWith(replacement);
  }
  return root;
}

/** Dựng nội dung đã đăng rồi tô tên được nhắc; khung soạn không dùng hàm này nên vẫn là chữ thường. */
export function renderPostedContent(container, content, options = {}) {
  renderRichContent(container, content, options);
  markMentions(container);
}
