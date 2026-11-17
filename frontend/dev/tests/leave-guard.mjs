/** Kiểm tra guard độc lập, không cần trình duyệt hoặc API: node --experimental-vm-modules frontend/dev/tests/leave-guard.mjs */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Nạp ES module thật để kiểm tra trạng thái dùng chung giữa các nơi gọi.
const source = await readFile(new URL('../../utils/leave-guard.js', import.meta.url), 'utf8');
const module = new vm.SourceTextModule(source);
await module.link(function rejectUnexpectedImport() {
  throw new Error('Guard phải độc lập với DOM và các module khác.');
});
await module.evaluate();
const { registerLeaveGuard, confirmLeave } = module.namespace;
assert.equal(await confirmLeave(), true);

// Guard từ chối phải ngăn các guard tiếp theo và có thể huỷ đăng ký an toàn nhiều lần.
const calls = [];
const unregisterFirst = registerLeaveGuard(async function rejectLeave() {
  calls.push('first');
  return false;
});
const unregisterSecond = registerLeaveGuard(async function acceptLeave() {
  calls.push('second');
  return true;
});
assert.equal(await confirmLeave(), false);
assert.deepEqual(calls, ['first']);
unregisterFirst();
unregisterFirst();
assert.equal(await confirmLeave(), true);
assert.deepEqual(calls, ['first', 'second']);
unregisterSecond();

// Hai thao tác đồng thời phải dùng chung Promise và chỉ mở câu hỏi một lần.
let answer;
let questions = 0;
const unregisterPending = registerLeaveGuard(function askOnce() {
  questions += 1;
  return new Promise(function waitForAnswer(resolve) {
    answer = resolve;
  });
});
const first = confirmLeave();
const second = confirmLeave();
assert.equal(first, second);
assert.equal(questions, 1);
answer(false);
assert.equal(await first, false);
assert.equal(await second, false);
const third = confirmLeave();
assert.equal(questions, 2);
answer(true);
assert.equal(await third, true);
unregisterPending();
assert.equal(await confirmLeave(), true);
console.log('leave-guard: passed');
