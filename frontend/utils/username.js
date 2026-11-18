/** Tên người dùng dùng chung: chuẩn hoá handle, kiểm tra và giữ con trỏ khi nhập. */

/** Chuyển chữ thường, bỏ khoảng trắng và tiền tố @ do người dùng tự gõ. */
export function normalizeUsername(value) {
  return String(value ?? '').toLowerCase().replace(/\s/gu, '').replace(/^@+/u, '');
}

/** Handle mới chỉ nhận chữ Latin thường, số và gạch dưới trong 3 đến 30 ký tự; không có dấu chấm để @tag cuối câu không bị dính. */
export function isValidUsername(value) {
  return typeof value === 'string' && /^[a-z0-9_]{3,30}$/u.test(value);
}

/** Trả lời nhắc tiếng Việt riêng cho từng nguyên nhân để các biểu mẫu dùng cùng quy tắc. */
export function validateUsername(value) {
  const text = String(value ?? '');
  if (!text.trim()) {
    return 'Vui lòng nhập tên người dùng.';
  }
  if (text.length < 3) {
    return 'Tên người dùng cần ít nhất 3 ký tự.';
  }
  if (text.length > 30) {
    return 'Tên người dùng không được vượt quá 30 ký tự.';
  }
  if (!isValidUsername(text)) {
    return 'Tên người dùng chỉ gồm chữ thường, số và dấu _.';
  }
  return '';
}

/** Chỉ thêm một dấu @ khi có handle thật, thiếu dữ liệu thì dùng gạch trung tính. */
export function formatHandle(username) {
  const text = String(username ?? '').trim().replace(/^@+/u, '');
  return text ? '@' + text : '–';
}

/** Tên hiển thị cho phép tiếng Việt, tiếng Nhật và trùng tên, giới hạn 50 ký tự sau trim như máy chủ. */
export function validateDisplayName(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return 'Vui lòng nhập tên hiển thị.';
  }
  return Array.from(text).length > 50 ? 'Tên hiển thị không được vượt quá 50 ký tự.' : '';
}

/** Chuẩn hoá cả vùng trước con trỏ để xoá khoảng trắng giữa chuỗi không đẩy con trỏ về cuối. */
export function normalizeUsernameInput(input) {
  const original = input.value;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const direction = input.selectionDirection;
  const normalized = normalizeUsername(original);
  if (original === normalized) {
    return;
  }
  input.value = normalized;
  if (start !== null && end !== null) {
    input.setSelectionRange(
      normalizeUsername(original.slice(0, start)).length,
      normalizeUsername(original.slice(0, end)).length,
      direction,
    );
  }
}

/** Nghe ngay tại input trước listener của form; chờ kết thúc bộ gõ để không phá IME. */
export function bindUsernameInput(input) {
  input.addEventListener('input', function normalizeTypedUsername(event) {
    if (!event.isComposing) {
      normalizeUsernameInput(input);
    }
  });
  input.addEventListener('compositionend', function normalizeComposedUsername() {
    normalizeUsernameInput(input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
