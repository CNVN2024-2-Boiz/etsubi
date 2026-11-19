/** Các trang đăng ký câu hỏi rời trang; header chỉ biết giao diện chung, không phụ thuộc module trang. */
const guards = new Set();
let pendingConfirmation = null;

/** Đăng ký độc lập và trả hàm huỷ để trang có thể dọn guard khi không còn cần nữa. */
export function registerLeaveGuard(confirm) {
  const registration = { confirm };
  guards.add(registration);
  return function unregisterLeaveGuard() {
    guards.delete(registration);
  };
}

/** Hỏi lần lượt các trang, dừng khi ở lại; nhiều thao tác cùng lúc dùng chung một lần hỏi. */
export function confirmLeave() {
  if (pendingConfirmation) {
    return pendingConfirmation;
  }
  // Giữ cùng một Promise khi hộp thoại đang mở để không dựng hai câu hỏi chồng nhau.
  pendingConfirmation = (async function askGuards() {
    for (const registration of [...guards]) {
      if (guards.has(registration) && !(await registration.confirm())) {
        return false;
      }
    }
    return true;
  })().finally(function clearPendingConfirmation() {
    pendingConfirmation = null;
  });
  return pendingConfirmation;
}
