/** Xử lý văn bản bằng nút DOM để kết quả tìm kiếm không chèn được HTML từ API. */

/**
 * Đánh dấu các lần xuất hiện của từ khoá bằng phép tìm chuỗi, không biên dịch regex từ dữ liệu nhập.
 * @param {*} text Văn bản gốc cần hiển thị.
 * @param {string} query Từ khoá, so sánh không phân biệt chữ hoa theo tiếng Việt.
 * @returns {DocumentFragment} Các nút văn bản và mark an toàn để gắn vào trang.
 */
export function highlight(text, query = '') {
  const value = String(text ?? '');
  const needle = String(query).trim().toLocaleLowerCase('vi');
  const fragment = document.createDocumentFragment();
  if (!needle) {
    fragment.append(value);
    return fragment;
  }
  const lower = value.toLocaleLowerCase('vi');
  let cursor = 0;
  let match = lower.indexOf(needle);
  // Duyệt từng vị trí khớp để giữ nguyên dấu, chữ hoa và mọi ký tự đặc biệt trong bản gốc.
  while (match !== -1) {
    fragment.append(value.slice(cursor, match));
    const mark = document.createElement('mark');
    mark.className = 'hl';
    mark.textContent = value.slice(match, match + needle.length);
    fragment.append(mark);
    cursor = match + needle.length;
    match = lower.indexOf(needle, cursor);
  }
  fragment.append(value.slice(cursor));
  return fragment;
}

/**
 * Bọc từng cụm chữ Nhật trong span lang=ja, kể cả chữ nằm trong mark, để dùng đúng phông.
 * @param {Node|string} fragmentOrText Nút DOM hoặc chuỗi văn bản đã được xử lý an toàn.
 * @returns {DocumentFragment} Nội dung giữ nguyên cấu trúc đánh dấu và bổ sung ngôn ngữ.
 */
export function wrapJapanese(fragmentOrText) {
  const fragment = document.createDocumentFragment();
  fragment.append(fragmentOrText instanceof Node ? fragmentOrText : String(fragmentOrText ?? ''));
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  // Thu thập trước khi thay thế để việc chèn span không làm bộ duyệt lặp lại chính nó.
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }
  for (const node of textNodes) {
    const pieces = node.textContent.split(/([\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]+)/u);
    if (pieces.length === 1 || node.parentElement?.closest('[lang="ja"]')) {
      continue;
    }
    const replacement = document.createDocumentFragment();
    for (let index = 0; index < pieces.length; index += 1) {
      if (index % 2 === 1) {
        const span = document.createElement('span');
        span.lang = 'ja';
        span.textContent = pieces[index];
        replacement.append(span);
      } else {
        replacement.append(pieces[index]);
      }
    }
    node.replaceWith(replacement);
  }
  return fragment;
}

/**
 * Rút nội dung về một đoạn ngắn gần lần khớp đầu tiên để người đọc thấy ngữ cảnh tìm kiếm.
 * @param {*} content Nội dung có thể chứa ký hiệu Markdown hoặc thẻ HTML dạng văn bản.
 * @param {string} query Từ khoá dùng chọn điểm bắt đầu đoạn trích.
 * @param {number} max Số ký tự nội dung tối đa, mặc định 220.
 * @returns {string} Đoạn trích thuần văn bản, có dấu ba chấm khi bị cắt.
 */
export function makeExcerpt(content, query = '', max = 220) {
  const text = String(content ?? '')
    .replace(/<[^>]*>/gu, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replace(/^[ \t]*[>#\-+]+\s*/gmu, '')
    .replace(/[`*_~]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
  const needle = String(query).trim().toLocaleLowerCase('vi');
  const match = needle ? text.toLocaleLowerCase('vi').indexOf(needle) : -1;
  const start = match > 80 ? Math.max(0, match - 40) : 0;
  const length = Math.max(1, max);
  return (start ? '…' : '') + text.slice(start, start + length)
    + (text.length > start + length ? '…' : '');
}
