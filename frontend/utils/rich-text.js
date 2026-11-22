/** Bộ lọc HTML thuần: chỉ giữ tập thẻ nhỏ, dùng cùng quy tắc ở Node và trình duyệt. */
import { htmlEntities } from '/utils/html-entities.js';
import { currentLocale, t } from '/utils/i18n.js';

// Thẻ định dạng được giữ; khối nguy hiểm bị bỏ cả nội dung thay vì chỉ bỏ vỏ.
const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'p', 'br', 'img']);
const BLOCKED = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'textarea', 'title']);
const ALIASES = { div: 'p', strike: 's', del: 's' };
const MAX_DEPTH = 32;

/** Giải mã đúng một lượt để &amp;lt; vẫn là chữ &lt;, không trở thành thẻ. */
export function decodeEntities(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+;?|#\d+;?|[a-z][a-z0-9]{0,31};?)/gi, (entity, name) => {
    // Mã số không hợp lệ thành ký tự thay thế, không tạo surrogate hoặc ký tự điều khiển NUL.
    if (name[0] === '#') {
      const hex = name[1]?.toLowerCase() === 'x';
      const number = parseInt(name.slice(hex ? 2 : 1).replace(/;$/, ''), hex ? 16 : 10);
      return number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff)
        ? String.fromCodePoint(number) : '\ufffd';
    }
    // Tên dài nhất thắng; HTML5 có một số tên cũ được phép thiếu dấu chấm phẩy.
    for (let length = name.length; length > 0; length--) {
      const prefix = name.slice(0, length);
      if (Object.hasOwn(htmlEntities, prefix)) return htmlEntities[prefix] + name.slice(length);
    }
    return entity;
  });
}

/** Mã hoá mọi ký tự cú pháp trước khi ghép chuỗi HTML chuẩn. */
function escapeText(value) {
  const escaped = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, character => escaped[character]);
}

/** Chỉ nhận URL tuyệt đối http/https, không tự sửa scheme bị che bằng khoảng trắng. */
export function safeRichUrl(value) {
  const url = String(value ?? '').trim();
  if (!/^https?:\/\//i.test(url) || /[\u0000-\u0020\u007f]/u.test(url)) return null;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    // URL lỗi chỉ mất liên kết, chữ vẫn được giữ.
    return null;
  }
}

/** Ảnh chỉ nhận HTTPS tuyệt đối, không chấp nhận khoảng trắng hoặc ký tự điều khiển. */
export function safeImageUrl(value) {
  const source = String(value ?? '');
  if (!/^https:\/\//i.test(source) || /[\s\u0000-\u001f\u007f-\u009f]/u.test(source)) return null;
  try {
    const parsed = new URL(source);
    return parsed.protocol === 'https:' && parsed.hostname ? parsed.href : null;
  } catch {
    // Không tự sửa đường dẫn lỗi vì có thể trỏ sang tài nguyên khác ý người nhập.
    return null;
  }
}

/** Kích thước phải là số nguyên thập phân trong giới hạn, không âm thầm ép giá trị lỗi. */
export function imageDimension(value) {
  const text = String(value ?? '');
  return /^[1-9]\d{0,3}$/.test(text) && Number(text) <= 4000 ? Number(text) : null;
}

/** Tách cú pháp bằng bộ quét có nhận dấu nháy; dữ liệu được giải mã sau bước tách thẻ. */
function scan(html) {
  const source = String(html ?? '');
  const chunks = [];
  let cursor = 0;
  // Quét tuyến tính từng ký tự, không dùng regex lặp chồng gây treo với thẻ chưa đóng.
  while (cursor < source.length) {
    if (source[cursor] !== '<') {
      const next = source.indexOf('<', cursor);
      const end = next < 0 ? source.length : next;
      chunks.push(source.slice(cursor, end)); cursor = end; continue;
    }
    const special = source.startsWith('<!--', cursor) ? ['-->', 4] : source.startsWith('<![CDATA[', cursor) ? [']]>', 9]
      : source.startsWith('<?', cursor) ? ['?>', 2] : source.startsWith('<!', cursor) ? ['>', 2] : null;
    if (special) {
      const found = source.indexOf(special[0], cursor + special[1]);
      const end = found < 0 ? source.length : found + special[0].length;
      chunks.push(source.slice(cursor, end)); cursor = end; continue;
    }
    let index = cursor + 1;
    const closing = source[index] === '/';
    if (closing) index++;
    const nameStart = index;
    if (!/[a-z]/i.test(source[index] || '')) { chunks.push('<'); cursor++; continue; }
    while (index < source.length && /[a-z0-9:-]/i.test(source[index])) index++;
    if (index < source.length && !/[\s/>]/.test(source[index])) { chunks.push('<'); cursor++; continue; }
    const name = source.slice(nameStart, index).toLowerCase();
    const attributeStart = index;
    let quote = null;
    for (; index < source.length; index++) {
      const character = source[index];
      if (quote) { if (character === quote) quote = null; }
      else if (character === '"' || character === "'") quote = character;
      else if (character === '>') break;
    }
    const end = index < source.length ? index + 1 : source.length;
    // Trả tên/thuộc tính đã tách để bước sau không phải chạy thêm regex trên chuỗi thẻ dài.
    chunks.push(index < source.length ? { name, closing, attributes: source.slice(attributeStart, index) } : source.slice(cursor, end));
    cursor = end;
  }
  return chunks;
}

/** Đọc href theo từng thuộc tính để không nhầm chữ href bên trong title hoặc thuộc tính khác. */
function readAttribute(attributes, wanted, decode = true) {
  let cursor = 0;
  while (cursor < attributes.length) {
    while (/\s/.test(attributes[cursor] || '') && cursor < attributes.length) cursor++;
    const start = cursor;
    while (cursor < attributes.length && !/[\s=/>]/.test(attributes[cursor])) cursor++;
    const name = attributes.slice(start, cursor).toLowerCase();
    if (!name) { cursor++; continue; }
    while (cursor < attributes.length && /\s/.test(attributes[cursor])) cursor++;
    let value = '';
    if (attributes[cursor] === '=') {
      cursor++;
      while (cursor < attributes.length && /\s/.test(attributes[cursor])) cursor++;
      const quote = ['"', "'"].includes(attributes[cursor]) ? attributes[cursor++] : null;
      const valueStart = cursor;
      if (quote) {
        while (cursor < attributes.length && attributes[cursor] !== quote) cursor++;
        value = attributes.slice(valueStart, cursor); cursor++;
      } else {
        while (cursor < attributes.length && !/\s/.test(attributes[cursor])) cursor++;
        value = attributes.slice(valueStart, cursor);
      }
    }
    if (name === wanted) return decode ? decodeEntities(value) : value;
  }
  return '';
}

/** Chuẩn hoá thành token an toàn; giới hạn độ sâu và đóng thẻ để DOM không phải tự đoán cấu trúc. */
export function sanitizeTokens(html, { allowLinks = false } = {}) {
  const tokens = [];
  const stack = [];
  const blocked = [];
  let overflow = 0;
  // Đóng từ đỉnh đến vị trí cần đóng, bỏ qua dấu đóng không có thẻ mở tương ứng.
  function closeAt(index) {
    while (stack.length > index) tokens.push({ close: stack.pop() });
  }
  for (const chunk of scan(html)) {
    const tag = typeof chunk === 'object' ? chunk : null;
    if (tag) {
      const raw = tag.name;
      const closing = tag.closing;
      // Vùng nguy hiểm không cho bất kỳ nội dung hoặc thẻ con nào đi vào kết quả.
      if (blocked.length) {
        if (raw === blocked.at(-1) && closing) blocked.pop();
        else if (BLOCKED.has(raw) && !closing) blocked.push(raw);
        continue;
      }
      if (BLOCKED.has(raw)) {
        if (!closing) blocked.push(raw);
        continue;
      }
      const name = ALIASES[raw] || raw;
      if (!ALLOWED.has(name) && !(allowLinks && name === 'a')) continue;
      // img là thẻ rỗng: bỏ dấu đóng ngay, không tác động stack hoặc bộ đếm độ sâu.
      if (name === 'img') {
        if (closing) continue;
        const rawSrc = readAttribute(tag.attributes, 'src', false);
        const src = /^https:\/\//i.test(rawSrc) ? safeImageUrl(decodeEntities(rawSrc)) : null;
        if (!src) continue;
        tokens.push({ open: 'img', image: { src, alt: Array.from(readAttribute(tag.attributes, 'alt')).slice(0, 300).join(''),
          width: imageDimension(readAttribute(tag.attributes, 'width')), height: imageDimension(readAttribute(tag.attributes, 'height')) } });
        continue;
      }
      if (closing) {
        if (overflow) { overflow--; continue; }
        const index = stack.lastIndexOf(name);
        if (index >= 0) closeAt(index);
        continue;
      }
      // Đoạn văn và liên kết không lồng cùng loại để chuỗi giữ nguyên sau nhiều lượt lọc.
      if (name === 'p' && stack.length) closeAt(0);
      if (name === 'a' && stack.includes('a')) closeAt(stack.lastIndexOf('a'));
      if (stack.length >= MAX_DEPTH || overflow) { if (name !== 'br') overflow++; continue; }
      let href = null;
      if (name === 'a') {
        href = safeRichUrl(readAttribute(tag.attributes, 'href'));
        if (!href) continue;
      }
      tokens.push({ open: name, href });
      if (name !== 'br') stack.push(name);
    } else if (!blocked.length && !/^<(?:!|\?)/.test(chunk)) {
      tokens.push({ text: decodeEntities(chunk) });
    }
  }
  closeAt(0);
  return tokens;
}

/** Xuất chuỗi HTML chuẩn chỉ có thẻ cho phép và href đã kiểm tra. */
export function sanitizeRichHtml(html, options = {}) {
  return sanitizeTokens(html, options).map(token => token.text !== undefined ? escapeText(token.text)
    : token.close ? '</' + token.close + '>'
      : token.image ? '<img src="' + escapeText(token.image.src) + '" alt="' + escapeText(token.image.alt) + '"'
        + (token.image.width ? ' width="' + token.image.width + '"' : '') + (token.image.height ? ' height="' + token.image.height + '"' : '') + '>'
      : '<' + token.open + (token.href ? ' href="' + escapeText(token.href) + '"' : '') + '>').join('');
}

/** Nhận biết bài cũ thuần văn bản để giữ xuống dòng và trích dẫn trước đây. */
export function hasRichTags(content, { allowLinks = false } = {}) {
  const text = String(content ?? '');
  return /<\/?(?:b|strong|i|em|u|s|strike|del|p|br|div|img)(?:\s|\/?>)/i.test(text)
    || (allowLinks && /<\/?a(?:\s|\/?>)/i.test(text));
}

/** Rút HTML về chữ; khối và br thành xuống dòng, không làm dính hai đoạn văn. */
export function richToPlainText(html) {
  return sanitizeTokens(html, { allowLinks: true }).map(token => token.text !== undefined ? token.text
    : token.open === 'br' || token.open === 'p' || token.close === 'p' ? '\n' : '').join('')
    .replace(/\n{3,}/g, '\n\n').trim();
}

/** Liệt kê các đoạn chữ nằm ngoài liên kết, dùng để nhận diện tên được nhắc trong nội dung. */
export function richTextOutsideLinks(html) {
  const pieces = [];
  let linkDepth = 0;
  for (const token of sanitizeTokens(html, { allowLinks: true })) {
    if (token.open === 'a') linkDepth += 1;
    else if (token.close === 'a') linkDepth -= 1;
    else if (token.text !== undefined && !linkDepth) pieces.push(token.text);
  }
  return pieces;
}

/** Đếm từ theo khoảng trắng, riêng từng chữ Hán/Hiragana/Katakana tính một từ. */
export function countWords(text) {
  // Token ch\u1ec9 g\u1ed3m d\u1ea5u c\u00e2u (d\u1ea5u ch\u1ea5m sau ch\u1eef Nh\u1eadt, g\u1ea1ch n\u1ed1i \u0111\u1ee9ng ri\u00eang) kh\u00f4ng t\u00ednh l\u00e0 t\u1eeb.
  return (String(text ?? '').match(/[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]|[^\s\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]+/gu) || [])
    .filter(token => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Đếm theo code point để emoji không bị tính thành hai ký tự; bỏ dấu xuống dòng. */
export function countChars(text) {
  return Array.from(String(text ?? '').replace(/[\r\n]/g, '')).length;
}

/** Độ dài UTF-8 thuần JS, chạy cả trong loader Node không cung cấp TextEncoder. */
export function utf8Bytes(text) {
  return Array.from(String(text ?? '')).reduce((total, character) => {
    const code = character.codePointAt(0);
    return total + (code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4);
  }, 0);
}

/** Kiểm tra giới hạn byte thật của máy chủ, trả lời nhắc tiếng Việt trước khi gửi. */
export function validateRichBytes(value, limit, label = t('Nội dung')) {
  return utf8Bytes(value) > limit ? t('{label} vượt quá giới hạn {limit} byte.', { label, limit: limit.toLocaleString(currentLocale()) }) : '';
}

/** Bọc chữ Nhật bằng DOM, không cần import tiện ích DOM vào phần lọc thuần. */
function appendText(parent, text, doc) {
  for (const piece of text.split(/([\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]+)/u)) {
    if (!piece) continue;
    if (/^[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/u.test(piece)) {
      const span = doc.createElement('span');
      span.lang = 'ja';
      span.append(doc.createTextNode(piece));
      parent.append(span);
    } else parent.append(doc.createTextNode(piece));
  }
}

/** Dựng nút từ token đã lọc, tuyệt đối không gán HTML API vào innerHTML. */
export function renderRichContent(container, content, options = {}) {
  const doc = container.ownerDocument;
  container.replaceChildren();
  if (!hasRichTags(content, options)) {
    // Bài cũ giữ cách chia đoạn và trích dẫn; vẫn lọc khối nguy hiểm trước khi hiện chữ.
    for (const block of richToPlainText(content).split(/\n\s*\n/u).filter(Boolean)) {
      const quote = block.split('\n').every(line => line.trim().startsWith('>'));
      const paragraph = doc.createElement(quote ? 'blockquote' : 'p');
      paragraph.className = quote ? 'post-body__quote' : 'rich-content__paragraph';
      block.split('\n').forEach((line, index) => {
        if (index) paragraph.append(doc.createElement('br'));
        appendText(paragraph, quote ? line.replace(/^\s*>\s?/, '') : line, doc);
      });
      container.append(paragraph);
    }
    return;
  }
  const parents = [container];
  // Chữ và thẻ inline nằm ngay cấp ngoài cùng được gom vào một đoạn ngầm,
  // để khung flex dọc (thân bài, bình luận) không tách mỗi chữ đậm thành một dòng riêng.
  let looseParagraph = null;
  /** Trả nơi nhận nút con: ở cấp ngoài cùng thì dùng (hoặc tạo) đoạn ngầm. */
  function target(isBlock) {
    if (parents.length > 1) return parents.at(-1);
    if (isBlock) { looseParagraph = null; return container; }
    if (!looseParagraph) {
      looseParagraph = doc.createElement('p');
      looseParagraph.className = 'rich-content__paragraph';
      container.append(looseParagraph);
    }
    return looseParagraph;
  }
  for (const token of sanitizeTokens(content, options)) {
    if (token.text !== undefined) {
      // Khoảng trắng thừa giữa hai đoạn không được tạo đoạn ngầm rỗng.
      if (parents.length === 1 && !looseParagraph && !token.text.trim()) continue;
      appendText(target(false), token.text, doc);
    } else if (token.close) {
      // Đóng thẻ inline ở cấp ngoài cùng chỉ rời thẻ đó, đoạn ngầm vẫn tiếp tục.
      parents.pop();
    } else {
      const node = doc.createElement(token.open);
      // Thuộc tính ảnh đều đã lọc; chỉ dùng DOM, không phân tích HTML lần thứ hai.
      if (token.image) {
        // Đặt chính sách tải trước src để request đầu tiên cũng không gửi Referer.
        node.setAttribute('loading', 'lazy');
        node.setAttribute('decoding', 'async');
        node.setAttribute('referrerpolicy', 'no-referrer');
        for (const [name, value] of Object.entries(token.image)) {
          if (name !== 'src' && value !== null) node.setAttribute(name, String(value));
        }
        node.setAttribute('src', token.image.src);
        node.className = 'rich-content__image';
      }
      if (token.href) {
        node.setAttribute('href', token.href);
        node.setAttribute('rel', 'noopener noreferrer nofollow ugc');
        node.setAttribute('target', '_blank');
      }
      if (token.open === 'p') node.className = 'rich-content__paragraph';
      target(token.open === 'p').append(node);
      if (!['br', 'img'].includes(token.open)) parents.push(node);
    }
  }
}
