/** Kiểm tra bộ lọc thuần: node --experimental-vm-modules frontend/dev/tests/rich-text.mjs */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const context = vm.createContext({ URL });
const modules = new Map();

/** Nạp module ES thật với đường dẫn frontend tuyệt đối, không cần package hoặc DOM. */
async function load(specifier) {
  if (!modules.has(specifier)) {
    const source = await readFile(new URL(specifier.slice(1), root), 'utf8');
    const module = new vm.SourceTextModule(source, { context, identifier: specifier });
    modules.set(specifier, module);
    await module.link(load);
  }
  return modules.get(specifier);
}
const module = await load('/utils/rich-text.js');
await module.evaluate();
const { sanitizeRichHtml: clean, richToPlainText: plain, countWords, countChars, utf8Bytes, validateRichBytes,
  hasRichTags, renderRichContent } = module.namespace;

// Giữ đúng tập định dạng, chuẩn hoá tên thẻ và loại mọi thuộc tính không được phép.
assert.equal(clean('<B onclick="bad()" style="color:red" class="x">A</B><em>B</em><u>C</u><strong>D</strong><i>E</i>'), '<b>A</b><em>B</em><u>C</u><strong>D</strong><i>E</i>');
assert.equal(clean('<div>A<br/>B</div><strike>C</strike><del>D</del>'), '<p>A<br>B</p><s>C</s><s>D</s>');
assert.equal(clean('<p title=">">A</p>'), '<p>A</p>');
assert.equal(clean('<h1>Tiêu đề</h1><span>chữ</span>'), 'Tiêu đềchữ');

// Vùng nguy hiểm mất cả nội dung; ảnh và SVG chỉ mất thẻ, không bao giờ tạo handler.
for (const tag of ['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'textarea', 'title']) {
  assert.equal(clean('A<' + tag + '>bad<b>inside</b></' + tag + '>Z'), 'AZ', tag);
  assert.equal(clean('A<' + tag + '>bad'), 'A', tag + ' chưa đóng');
}
assert.equal(clean('A<embed src=x>Z'), 'A');
assert.equal(clean('<script title="x>y">alert(1)</script>'), '');
assert.equal(clean('<img src=x onerror=alert(1)>ok'), 'ok');
assert.equal(clean('<svg onload=alert(1)><circle/><text>chữ</text></svg>'), 'chữ');
assert.equal(clean('A<!-- secret --><!DOCTYPE html><![CDATA[bad]]><?bad?>Z'), 'AZ');

// Liên kết chỉ giữ href http/https khi caller cho phép; mọi scheme che giấu đều bị loại.
assert.equal(clean('<a href="https://example.com">A</a>'), 'A');
assert.equal(clean('<a href=" HTTPS://Example.com/a?x=1&amp;y=2 " onclick=x>A</a>', { allowLinks: true }), '<a href="https://example.com/a?x=1&amp;y=2">A</a>');
assert.equal(clean('<a href=http://example.com>A</a>', { allowLinks: true }), '<a href="http://example.com/">A</a>');
assert.equal(clean('<a title=\' href="https://evil.com"\' href="javascript:x">A</a>', { allowLinks: true }), 'A');
for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', '&#106;avascript:alert(1)',
  'java&#x09;script:alert(1)', 'data:text/html,bad', 'vbscript:bad', '//evil.com', 'https&#58;//evil.com/&#10;x', '&amp;#106;avascript:bad']) {
  assert.equal(clean('<a href="' + href + '">chữ</a>', { allowLinks: true }), 'chữ', href);
}

// Thẻ không đóng được đóng lại, dấu đóng lạc bị bỏ và độ sâu không vượt mức cho phép.
assert.equal(clean('<b>A<i>B'), '<b>A<i>B</i></b>');
assert.equal(clean('</u>A</b><b>B</b>'), 'A<b>B</b>');
assert.equal(clean('<b><i>A</b>B</i>'), '<b><i>A</i></b>B');
assert.equal(clean('<p>A<p>B'), '<p>A</p><p>B</p>');
const deep = clean('<b>'.repeat(1000) + 'A' + '</b>'.repeat(1000));
assert.equal((deep.match(/<b>/g) || []).length, 32);
assert.equal(plain(deep), 'A');

// Thực thể giải mã đúng một lượt và luôn mã hoá lại; không thể biến chữ thành thẻ.
assert.equal(clean('&amp;lt;'), '&amp;lt;');
assert.equal(plain('&amp;lt;'), '&lt;');
assert.equal(clean('&lt;b&gt;&quot;&#39;&amp;'), '&lt;b&gt;&quot;&#39;&amp;');
assert.equal(clean('&copy; &eacute; &#x1f338;'), '© é 🌸');
assert.equal(clean('&copy &amp &nbsp'), '© &amp;  ');
assert.equal(clean('"><script>alert(1)</script>'), '&quot;&gt;');
assert.equal(clean('x < 2 & y > 3'), 'x &lt; 2 &amp; y &gt; 3');
assert.equal(clean('&#0; &#xD800; &#x110000;'), '� � �');
// Thẻ rất dài chưa đóng phải kết thúc nhanh, không lặp dò regex làm treo trang.
assert.equal(clean('<b ' + ' '.repeat(100000)), '&lt;b ' + ' '.repeat(100000));
assert.equal(clean('<b' + '-'.repeat(100000)), '&lt;b' + '-'.repeat(100000));

// Bộ lọc phải ổn định sau nhiều lần đọc HTML, tránh tăng độ mã hoá qua mỗi input.
for (const value of ['<b>A &amp; B</b>', '<p>A<div>B</div></p>', '<a href="https://example.com/?a=1&amp;b=2">Link</a>', deep, '&amp;lt;']) {
  const safe = clean(value, { allowLinks: true });
  assert.equal(clean(safe, { allowLinks: true }), safe);
}
assert.equal(hasRichTags('Văn bản < 2'), false);
assert.equal(hasRichTags('Hai đoạn\n\nxin chào'), false);
assert.equal(hasRichTags('<strong>đậm</strong>'), true);
assert.equal(hasRichTags('<div>đoạn</div>'), true);
assert.equal(hasRichTags('<a href="https://example.com">link</a>'), false);
assert.equal(hasRichTags('<a href="https://example.com">link</a>', { allowLinks: true }), true);
assert.equal(plain('<p>Xin <b>chào</b><br>bạn</p><p>日本語</p>'), 'Xin chào\nbạn\n\n日本語');
assert.equal(plain('Cũ\n\nHai\ndòng'), 'Cũ\n\nHai\ndòng');

// Từ tiếng Việt theo khoảng trắng; mỗi chữ Nhật và code point emoji đếm đúng quy tắc Figma.
assert.equal(countWords('Xin chào Việt Nam'), 4);
assert.equal(countWords('日本語を勉強'), 6);
assert.equal(countWords('Xin 日本語 bạn'), 5);
assert.equal(countWords('  \n\t '), 0);
// Dấu câu đứng riêng (sau chữ Nhật hoặc gạch nối) không được tính thành một từ.
assert.equal(countWords('Mình vừa ghé Camellia Tea ở Kyoto 京都.'), 9);
assert.equal(countWords('Hà Nội – Tokyo !'), 3);
assert.equal(countWords(''), 0);
assert.equal(countChars('a🌸日\r\nb'), 4);
assert.equal(countChars(''), 0);
assert.equal(utf8Bytes('aé日🌸'), 10);
assert.equal(utf8Bytes('\ud800'), 3);
assert.equal(validateRichBytes('a'.repeat(255), 255, 'Tiêu đề'), '');
assert.ok(validateRichBytes('日'.repeat(86), 255, 'Tiêu đề'));
assert.equal(validateRichBytes('a'.repeat(100000), 100000), '');
assert.ok(validateRichBytes('<p>' + 'a'.repeat(100000) + '</p>', 100000));
assert.equal(validateRichBytes('a'.repeat(10000), 10000, 'Bình luận'), '');
assert.ok(validateRichBytes('a'.repeat(10001), 10000, 'Bình luận'));

/** DOM giả chỉ có các phương thức an toàn; gán innerHTML sẽ làm test thất bại. */
function node(tag = '#fragment') {
  return { tag, children: [], attrs: {}, ownerDocument: doc,
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    setAttribute(key, value) { this.attrs[key] = value; },
    set innerHTML(value) { throw new Error('Không được gán innerHTML: ' + value); },
  };
}
const doc = { createElement: tag => node(tag), createTextNode: text => ({ text }) };
const container = node();
renderRichContent(container, '<p>A<a href="https://example.com">link</a><img src=x></p>', { allowLinks: true });
assert.equal(container.children[0].tag, 'p');
assert.equal(container.children[0].children[1].tag, 'a');
assert.equal(container.children[0].children[1].attrs.rel, 'noopener noreferrer nofollow ugc');
assert.equal(container.children[0].children[1].attrs.target, '_blank');
renderRichContent(container, 'Xin chào\n日本語\n\nĐoạn hai');
assert.equal(container.children.length, 2);
assert.equal(container.children[0].children[1].tag, 'br');
assert.equal(container.children[0].children[2].tag, 'span');
assert.equal(container.children[0].children[2].lang, 'ja');
// Chữ và thẻ inline ở cấp ngoài cùng (editor không bọc <p> cho dòng đầu) được gom vào một đoạn,
// để thân bài dạng flex dọc không tách chữ đậm thành dòng riêng.
renderRichContent(container, 'Mình ghé <b>Camellia</b> ở 京都.<p>Đoạn hai</p>');
assert.equal(container.children.length, 2);
assert.equal(container.children[0].tag, 'p');
assert.deepEqual(container.children[0].children.map(child => child.tag || 'text'), ['text', 'b', 'text', 'span', 'text']);
assert.equal(container.children[1].tag, 'p');

// Service địa điểm dùng module thật, chỉ thay cổng mạng để đo nhịp gửi và cache mà không gọi Internet.
context.URLSearchParams = URLSearchParams;
context.setTimeout = setTimeout;
const geoCalls = [];
const session = new Map();
modules.set('/services/api/client.js', new vm.SyntheticModule(['requestExternal', 'readStorage', 'writeStorage'], function geoClient() {
  this.setExport('readStorage', key => session.get(key) || null);
  this.setExport('writeStorage', (key, value) => session.set(key, value));
  this.setExport('requestExternal', async url => {
    geoCalls.push({ url: new URL(url), started: Date.now() });
    const point = { lat: '10.8', lon: '106.8', name: 'Địa điểm thật', display_name: 'A, B, C, D, E' };
    return url.includes('/reverse?') ? point : [point];
  });
}, { context }));
const geo = await load('/services/geo/nominatim.js');
await geo.evaluate();
const { searchPlaces, reversePlace } = geo.namespace;
assert.equal((await searchPlaces('ab')).length, 0);
const first = await searchPlaces('Kyoto');
assert.equal(first[0].name, 'Địa điểm thật');
assert.equal(first[0].address, 'A, B, C, D');
assert.equal((await searchPlaces('Kyoto'))[0].name, first[0].name);
assert.equal(geoCalls.length, 1);
const abortGeo = new AbortController();
abortGeo.abort();
await assert.rejects(searchPlaces('Cancelled', { signal: abortGeo.signal }), error => error.name === 'AbortError');
assert.equal(geoCalls.length, 1);
const reverse = await reversePlace(10.7769, 106.7009);
assert.equal(reverse.latitude, 10.7769);
assert.equal(reverse.longitude, 106.7009);
assert.ok(geoCalls[1].started - geoCalls[0].started >= 995, 'Mọi request Nominatim phải cách nhau ít nhất một giây.');
const cached = await reversePlace(10.7769, 106.7009);
assert.equal(cached.latitude, 10.7769);
assert.equal(geoCalls.length, 2);
assert.equal(geoCalls[0].url.searchParams.get('accept-language'), 'vi');
assert.equal(geoCalls[0].url.searchParams.get('limit'), '5');
console.log('rich-text: passed');
