/**
 * Kiểm tra bản dịch giao diện: chữ tiếng Việt chưa bọc t(), khoá thiếu trong từ điển và lỗi bản dịch.
 * Chạy: node frontend/dev/tests/i18n.mjs            kiểm tra toàn bộ
 *       node frontend/dev/tests/i18n.mjs pages/foo  chỉ báo các file có đường dẫn chứa pages/foo
 */
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const filter = process.argv[2]?.replaceAll('\\', '/');
const vietnamese = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/iu;
const skippedFolders = new Set(['vendor', 'dev', 'i18n', 'assets', 'node_modules', 'public']);
const skippedFiles = new Set(['utils/html-entities.js']);
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const allowedTags = new Set(['a', 'b', 'br', 'code', 'em', 'kbd', 'small', 'span', 'strong']);
const problems = [];
const usedKeys = new Map();

/** Gom đường dẫn tương đối của mọi file HTML và JS cần kiểm tra. */
async function listFiles(folder) {
  const found = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory() && !skippedFolders.has(entry.name)) {
      found.push(...await listFiles(path));
    } else if (entry.isFile() && /\.(?:html|js)$/u.test(entry.name)) {
      const name = relative(root, path).split(sep).join('/');
      if (!skippedFiles.has(name)) {
        found.push(name);
      }
    }
  }
  return found;
}

/** Ghi một lỗi kèm vị trí để người sửa mở đúng dòng. */
function report(file, line, message) {
  if (!filter || file.includes(filter)) {
    problems.push(file + ':' + line + ' ' + message);
  }
}

/** Ghi nhận khoá đang được dùng để đối chiếu với từ điển. */
function useKey(file, line, key) {
  if (!usedKeys.has(key)) {
    usedKeys.set(key, file + ':' + line);
  }
}

/** Đọc từng chuỗi trong JS, bỏ qua comment và biểu thức chính quy. */
function scanScript(file, source) {
  const lines = source.split('\n');
  let index = 0;
  let line = 1;
  let previous = '';

  /** Chuyển con trỏ và đếm số dòng đã đi qua. */
  function advance(count = 1) {
    for (let step = 0; step < count; step++) {
      if (source[index + step] === '\n') {
        line++;
      }
    }
    index += count;
  }

  /** Kiểm tra một chuỗi tiếng Việt đã được bọc t() hay được đánh dấu bỏ qua. */
  function checkString(text, startLine, start, template) {
    const before = source.slice(Math.max(0, start - 12), start);
    const wrapped = /(?:^|[^\w.$])t\(\s*$/u.test(before);
    if (wrapped) {
      if (template && text.includes('${')) {
        report(file, startLine, 'khoá t() không được chứa ${}, hãy dùng {ten}: ' + text);
      }
      useKey(file, startLine, text.replace(/\\'/g, "'").replace(/\\n/g, '\n'));
      return;
    }
    const ignored = /i18n-ignore/u.test(lines[startLine - 1] || '') || /i18n-ignore/u.test(lines[startLine - 2] || '');
    if (vietnamese.test(text) && !ignored) {
      report(file, startLine, 'chưa bọc t(): ' + text.slice(0, 90));
    }
  }

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') advance();
    } else if (char === '/' && next === '*') {
      advance(2);
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) advance();
      advance(2);
    } else if (char === "'" || char === '"' || char === '`') {
      const start = index;
      const startLine = line;
      advance();
      let text = '';
      let depth = 0;
      while (index < source.length && (source[index] !== char || depth > 0)) {
        if (source[index] === '\\') {
          text += source[index] + source[index + 1];
          advance(2);
          continue;
        }
        if (char === '`' && source[index] === '$' && source[index + 1] === '{') depth++;
        else if (char === '`' && depth > 0 && source[index] === '}') depth--;
        text += source[index];
        advance();
      }
      advance();
      checkString(text, startLine, start, char === '`');
      previous = char;
    } else if (char === '/' && (/[(,=:[!&|?{};\n]/u.test(previous) || previous === '' || /\breturn\s*$/u.test(source.slice(Math.max(0, index - 8), index)))) {
      advance();
      let inClass = false;
      while (index < source.length && (source[index] !== '/' || inClass) && source[index] !== '\n') {
        if (source[index] === '\\') advance();
        else if (source[index] === '[') inClass = true;
        else if (source[index] === ']') inClass = false;
        advance();
      }
      advance();
      previous = '/';
    } else {
      if (!/\s/u.test(char) || char === '\n') {
        previous = char;
      }
      advance();
    }
  }
}

/** Gộp khoảng trắng giống translatePage để khoá trong HTML khớp với từ điển. */
function clean(value) {
  return value.replace(/\s+/g, ' ').trim();
}

/** Đọc thẻ HTML để tìm chữ và thuộc tính tiếng Việt chưa được đánh dấu dịch. */
function scanHtml(file, source) {
  const blanked = source.replace(/<!--[\s\S]*?-->/g, match => match.replace(/[^\n]/g, ' '));
  const token = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  const stack = [];
  let cursor = 0;
  let match;

  /** Tính số dòng từ vị trí ký tự trong file. */
  const lineAt = position => source.slice(0, position).split('\n').length;

  /** Kiểm tra đoạn chữ nằm giữa hai thẻ. */
  function checkText(text, position) {
    const value = clean(text);
    const covered = stack.some(item => item.translated);
    const raw = stack.some(item => item.tag === 'script' || item.tag === 'style');
    if (value && vietnamese.test(value) && !covered && !raw) {
      report(file, lineAt(position), 'chữ HTML chưa có data-i18n: ' + value.slice(0, 90));
    }
  }

  while ((match = token.exec(blanked))) {
    checkText(blanked.slice(cursor, match.index), cursor);
    cursor = token.lastIndex;
    const [full, closing, rawTag, attributes] = match;
    const tag = rawTag.toLowerCase();
    if (closing) {
      for (let at = stack.length - 1; at >= 0; at--) {
        if (stack[at].tag === tag) {
          const item = stack[at];
          if (item.mode) {
            const inner = blanked.slice(item.contentStart, match.index);
            useKey(file, lineAt(match.index), item.mode === 'html' ? clean(inner) : clean(inner.replace(/<[^>]+>/g, '')));
          }
          stack.length = at;
          break;
        }
      }
      continue;
    }
    const mode = /\sdata-i18n-html(?=[\s=]|$)/u.test(attributes) ? 'html' : /\sdata-i18n(?=[\s=]|$)/u.test(attributes) ? 'text' : null;
    const listed = attributes.match(/\sdata-i18n-attr="([^"]*)"/u)?.[1].split(',').map(item => item.trim()) || [];
    for (const attribute of attributes.matchAll(/\s(placeholder|aria-label|title|alt|content)="([^"]*)"/gu)) {
      if (!vietnamese.test(attribute[2])) continue;
      if (listed.includes(attribute[1])) useKey(file, lineAt(match.index), clean(attribute[2]));
      else report(file, lineAt(match.index), 'thuộc tính ' + attribute[1] + ' chưa có data-i18n-attr: ' + attribute[2].slice(0, 80));
    }
    if (!voidTags.has(tag) && !full.endsWith('/>')) {
      stack.push({ tag, mode, translated: Boolean(mode), contentStart: token.lastIndex });
    }
  }
}

/** Tách danh sách {ten} trong câu để so giữa bản gốc và bản dịch. */
function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map(item => item[1]).sort().join(',');
}

/** Kiểm tra từng mục từ điển: đủ JA/EN, đúng biến, đúng thẻ và không có em dash. */
function checkDictionary(groups) {
  const owners = new Map();
  for (const [group, entries] of Object.entries(groups)) {
    for (const [key, entry] of Object.entries(entries)) {
      const label = 'i18n/' + group + '.js';
      if (owners.has(key) && JSON.stringify(owners.get(key)) !== JSON.stringify(entry)) {
        report(label, 0, 'khoá trùng nhưng bản dịch khác nhau: ' + key);
      }
      owners.set(key, entry);
      for (const language of ['ja', 'en']) {
        const value = entry[language];
        const forms = typeof value === 'object' && value ? [value.one, value.other] : [value];
        for (const form of forms) {
          if (typeof form !== 'string' || !form.trim()) {
            report(label, 0, 'thiếu bản ' + language + ': ' + key);
          } else {
            if (placeholders(form) !== placeholders(key)) report(label, 0, 'sai biến {} ở bản ' + language + ': ' + key);
            if (form.includes('\u2014')) report(label, 0, 'có em dash ở bản ' + language + ': ' + key);
            for (const tag of form.matchAll(/<\/?([a-zA-Z]+)/g)) {
              if (!allowedTags.has(tag[1].toLowerCase())) report(label, 0, 'thẻ không được phép <' + tag[1] + '>: ' + key);
            }
          }
        }
      }
    }
  }
  return owners;
}

const files = await listFiles(root);
for (const file of files) {
  const source = await readFile(join(root, file), 'utf8');
  if (file.endsWith('.html')) scanHtml(file, source.replaceAll('\r\n', '\n'));
  else scanScript(file, source.replaceAll('\r\n', '\n'));
}

// Nạp từ điển bằng cách đổi đường dẫn gốc của trình duyệt sang đường dẫn file.
const groups = {};
for (const name of ['common', 'forum', 'settings', 'auth', 'discover', 'info']) {
  groups[name] = (await import('file:///' + join(root, 'i18n', name + '.js').split(sep).join('/'))).default;
}
const known = checkDictionary(groups);
for (const [key, where] of usedKeys) {
  if (!known.has(key)) {
    const [file, line] = where.split(':');
    // Đặt I18N_FULL=1 để in đủ câu khi cần chép khoá sang từ điển.
    report(file, line, 'khoá chưa có trong từ điển: ' + (process.env.I18N_FULL ? key : key.slice(0, 90)));
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error('i18n: còn ' + problems.length + ' mục cần xử lý.');
  process.exit(1);
}
console.log('i18n: đạt, ' + known.size + ' mục từ điển' + (filter ? ' (lọc theo ' + filter + ')' : '') + '.');
