/** Trang mở từ link trong mail xác nhận: kích hoạt tài khoản, đăng nhập rồi sang bước bổ sung hồ sơ. */
import { mountAuthShell } from '/utils/auth-page.js';
import { verifyEmail, resendVerification } from '/services/api/auth.js';
import { startSession } from '/utils/auth.js';
import { routes } from '/utils/routes.js';
import { qs, el } from '/utils/dom.js';
import { t } from '/utils/i18n.js';
import { toVietnameseMessage } from '/utils/errors.js';

mountAuthShell({
  title: t('XIN CHÀO'),
  copyLines: [t('Cầu nối văn hoá Việt – Nhật'), t('cho sinh viên đại học.')],
});

const state = qs('[data-state]');

/**
 * Thay nội dung thẻ bằng một trạng thái: tiêu đề, lời giải thích và các nút tuỳ chọn.
 * @param {string} title Tiêu đề lớn của thẻ.
 * @param {string[]} lines Các đoạn giải thích.
 * @param {Node[]} actions Nút hoặc liên kết đặt dưới cùng.
 */
function show(title, lines, actions = []) {
  state.replaceChildren(
    el('h1', { className: 't-display auth-card__title', id: 'auth-title' }, title),
    ...lines.map(line => el('p', { className: 'auth-card__subtitle' }, line)),
    ...actions,
  );
}

/** Biểu mẫu nhỏ xin link xác nhận mới khi link cũ hỏng hoặc hết hạn. */
function resendForm() {
  const input = el('input', { className: 'input', type: 'email', name: 'email', id: 'email', autocomplete: 'email', placeholder: 'you@example.com', required: true });
  const note = el('p', { className: 'alert alert--info auth-card__message', role: 'status', hidden: true });
  const button = el('button', { className: 'btn btn--primary btn--block', type: 'submit' }, t('Gửi link xác nhận mới'));
  const form = el('form', { className: 'auth-card__done', novalidate: true },
    el('div', { className: 'field' }, el('label', { className: 'field__label', for: 'email' }, 'Email'), input),
    button, note);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
      note.textContent = t('Vui lòng nhập địa chỉ email hợp lệ.');
      note.hidden = false;
      input.focus();
      return;
    }
    button.disabled = true;
    try {
      await resendVerification(email);
      note.textContent = t('Nếu email này đang chờ xác nhận, link mới đã được gửi. Hãy kiểm tra cả thư mục Spam.');
    } catch (error) {
      note.textContent = toVietnameseMessage(error);
      button.disabled = false;
    }
    note.hidden = false;
  });
  return form;
}

const loginLink = () => el('a', { className: 'btn btn--primary btn--block', href: routes.login }, t('Đến trang đăng nhập'));

/**
 * Gửi token lên máy chủ và hiện kết quả phù hợp.
 * @param {string} token Token lấy từ link trong mail (đã xoá khỏi thanh địa chỉ).
 */
async function attempt(token) {
  show(t('Đang xác nhận email…'), [t('Vui lòng đợi trong giây lát.')]);
  try {
    const result = await verifyEmail(token);
    await startSession(result.token, { remember: true });
    show(t('Email đã được xác nhận'), [t('Tài khoản đã sẵn sàng. Tiếp theo, hãy bổ sung hồ sơ để mọi người biết bạn là ai.')], [
      el('a', { className: 'btn btn--primary btn--block', href: routes.registerAdvanced }, t('Bổ sung hồ sơ')),
    ]);
    location.assign(routes.registerAdvanced);
  } catch (error) {
    const code = error?.data?.code;
    if (code === 'already_verified') {
      show(t('Email đã được xác nhận trước đó'), [t('Bạn có thể đăng nhập bằng email và mật khẩu đã đăng ký.')], [loginLink()]);
    } else if (code === 'invalid_link') {
      show(t('Link không hợp lệ hoặc đã hết hạn'), [t('Link xác nhận chỉ dùng được trong 24 giờ. Nhập email đăng ký để nhận link mới.')], [resendForm()]);
    } else if (error?.status === 0 || error?.status >= 500) {
      // Lỗi mạng hoặc máy chủ: token vẫn còn trong bộ nhớ nên cho thử lại mà không cần mở lại mail.
      const retry = el('button', { className: 'btn btn--primary btn--block', type: 'button' }, t('Thử lại'));
      retry.addEventListener('click', () => void attempt(token));
      show(t('Chưa xác nhận được email'), [toVietnameseMessage(error)], [retry]);
    } else {
      show(t('Chưa xác nhận được email'), [toVietnameseMessage(error)], [loginLink()]);
    }
  }
}

const token = new URLSearchParams(location.search).get('token');
if (token) {
  // Xoá token khỏi thanh địa chỉ để không lộ khi người dùng chia sẻ màn hình hoặc copy URL.
  history.replaceState(null, '', routes.verifyEmail);
  void attempt(token);
} else {
  show(t('Thiếu link xác nhận'), [t('Hãy mở đúng link trong mail Etsubi đã gửi, hoặc xin link mới bên dưới.')], [resendForm()]);
}
