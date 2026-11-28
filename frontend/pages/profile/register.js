/** Khởi tạo trang đăng ký: tạo tài khoản chờ xác nhận rồi hướng dẫn mở mail kích hoạt. */
import { initAuthPage } from '/utils/auth-page.js';
import { register, resendVerification } from '/services/api/auth.js';
import { routes } from '/utils/routes.js';
import { qs, el } from '/utils/dom.js';
import { currentLanguage, t } from '/utils/i18n.js';
import { toVietnameseMessage } from '/utils/errors.js';

// Sau mỗi lần gửi lại mail, nút khoá 60 giây đúng bằng giới hạn của máy chủ.
const RESEND_WAIT_SECONDS = 60;

/**
 * Thay biểu mẫu bằng hướng dẫn mở hộp thư, kèm nút gửi lại mail xác nhận.
 * @param {HTMLFormElement} form Biểu mẫu đăng ký vừa gửi thành công.
 * @param {string} email Địa chỉ đã nhận mail xác nhận.
 */
function showCheckInbox(form, email) {
  const status = el('p', { className: 'alert alert--info auth-card__message', role: 'status', hidden: true });
  const resend = el('button', { type: 'button', className: 'btn btn--secondary btn--block' }, t('Gửi lại email xác nhận'));
  let timer = null;

  /** Khoá nút và đếm ngược bằng chữ tĩnh, không dùng animation. */
  function lockResend(seconds) {
    resend.disabled = true;
    let left = seconds;
    resend.textContent = t('Gửi lại sau {seconds} giây', { seconds: left });
    clearInterval(timer);
    timer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(timer);
        resend.disabled = false;
        resend.textContent = t('Gửi lại email xác nhận');
        return;
      }
      resend.textContent = t('Gửi lại sau {seconds} giây', { seconds: left });
    }, 1000);
  }

  resend.addEventListener('click', async () => {
    lockResend(RESEND_WAIT_SECONDS);
    try {
      await resendVerification(email);
      status.textContent = t('Đã gửi lại. Nếu vẫn chưa thấy, hãy xem thư mục Spam hoặc Quảng cáo.');
    } catch (error) {
      status.textContent = toVietnameseMessage(error);
    }
    status.hidden = false;
  });

  const panel = el('div', { className: 'auth-card__done', role: 'status' },
    el('h2', { className: 't-display auth-card__title' }, t('Kiểm tra hộp thư của bạn')),
    el('p', { className: 'auth-card__subtitle' },
      t('Etsubi đã gửi link xác nhận tới {email}. Bấm "Xác nhận email" trong mail trong vòng 24 giờ để kích hoạt tài khoản.', { email })),
    el('p', { className: 'auth-card__subtitle' }, t('Chưa xác nhận thì chưa đăng nhập được.')),
    resend,
    status,
    el('a', { className: 'btn btn--primary btn--block', href: routes.login }, t('Đến trang đăng nhập')),
  );
  // Vừa gửi mail lúc đăng ký nên khoá nút gửi lại ngay từ đầu.
  lockResend(RESEND_WAIT_SECONDS);
  form.replaceWith(panel);
  qs('.auth-card__switch')?.setAttribute('hidden', '');
  qs('.auth-card__title:not(.auth-card__done .auth-card__title)')?.setAttribute('hidden', '');
  qs('.auth-card__subtitle:not(.auth-card__done .auth-card__subtitle)')?.setAttribute('hidden', '');
  panel.querySelector('h2').focus?.();
}

// Lời chào và thao tác gửi riêng; các trường và thông báo dùng chung với trang login.
initAuthPage({
  mode: 'register',
  title: t('THAM GIA'),
  copyLines: [t('Cùng khám phá văn hoá Việt – Nhật'), t('cùng cộng đồng sinh viên.')],
  /** Tạo tài khoản kèm hai ô đồng ý; ngôn ngữ mẹ đẻ tạm lấy theo giao diện, đổi được ở bước bổ sung hồ sơ. */
  async onSubmit(values, { form }) {
    const language = currentLanguage();
    await register({
      displayname: values.displayname,
      username: values.username,
      email: values.email,
      password: values.password,
      native: language,
      language,
      acceptTerms: values.terms === 'on',
      acceptPrivacy: values.privacy === 'on',
    });
    showCheckInbox(form, values.email);
  },
});

// CẦN BACKEND: endpoint OAuth Google (ví dụ GET /auth/google chuyển hướng, callback trả token như POST /auth/login)
// Ghi vào vùng trạng thái riêng dưới nút để không xoá thông báo khác; không gửi form hoặc gọi API.
// Dùng ?. vì HTML cũ còn trong bộ nhớ đệm có thể chưa có nút hoặc vùng ghi chú này.
qs('[data-google-auth]')?.addEventListener('click', () => {
  const note = qs('[data-google-note]');
  if (!note) {
    return;
  }
  note.textContent = t('Đăng ký bằng Google sắp có.');
  note.hidden = false;
});
