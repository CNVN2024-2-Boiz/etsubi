/** Kiểm tra bản xem trước bằng bộ lọc thật, không cần DOM. */
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
const module = await load('/utils/feed-preview.js');
await module.evaluate();
const { buildFeedPreview } = module.namespace;

// Dùng đường dẫn thử để kiểm tra đúng thứ tự, không tải ảnh khi chạy Node.
const image = name => '<img src="https://example.test/' + name + '.png">';
const preview = content => {
  const { text, images } = buildFeedPreview(content);
  return [text, Array.from(images, item => new URL(item.src).pathname)];
};
assert.deepEqual(preview('<p>First picture:</p>' + image('one') + '<p>Second</p>' + image('two')), ['First picture:', ['/one.png']]);
assert.deepEqual(preview(image('one') + '<p>After</p>'), ['', ['/one.png']]);
assert.deepEqual(preview('<p>' + image('one') + '</p><br><p>&nbsp;' + image('two') + ' ' + image('three') + '</p>'),
  ['', ['/one.png', '/two.png', '/three.png']]);
assert.deepEqual(preview('<p>Hello <strong>@student</strong></p><p>World</p>'), ['Hello @student World', []]);
assert.deepEqual(preview('日'.repeat(260)), ['日'.repeat(260), []]);
assert.deepEqual(preview('😀'.repeat(261)), ['😀'.repeat(259) + '…', []]);
assert.deepEqual(preview('<script>bad</script><img src="http://example.test/x">A' + image('one') + image('two')
  + image('three') + image('four') + image('five')), ['A', ['/one.png', '/two.png', '/three.png', '/four.png']]);
console.log('feed-preview: đạt');
