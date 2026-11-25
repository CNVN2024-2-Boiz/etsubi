/** Rút bản xem trước từ cùng bộ lọc với trang đọc bài để giữ đúng thứ tự chữ và ảnh. */
import { sanitizeTokens } from '/utils/rich-text.js';

/** Lấy chữ trước ảnh và tối đa bốn ảnh đầu tiên không bị ngắt bởi chữ. */
export function buildFeedPreview(content) {
  const textParts = [];
  const images = [];
  for (const token of sanitizeTokens(content)) {
    // Xuống dòng và định dạng giữa các ảnh vẫn thuộc cùng một nhóm.
    if (token.image) {
      images.push(token.image);
      if (images.length === 4) break;
    } else if (images.length) {
      if (token.text?.trim()) break;
    } else if (token.text !== undefined) {
      textParts.push(token.text);
    } else if (token.open === 'br' || token.open === 'p' || token.close === 'p') {
      textParts.push(' ');
    }
  }
  // Tính theo ký tự Unicode, dành một ký tự cho dấu cắt để không vượt giới hạn.
  const characters = Array.from(textParts.join('').replace(/\s+/gu, ' ').trim());
  const text = characters.length > 260 ? characters.slice(0, 259).join('').trimEnd() + '…' : characters.join('');
  return { text, images };
}
