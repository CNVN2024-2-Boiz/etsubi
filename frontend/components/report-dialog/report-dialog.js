/**
 * Hộp thoại Báo cáo vi phạm dùng chung cho bài viết, bình luận và người dùng.
 * Người báo cáo được điền sẵn từ tài khoản đang đăng nhập (máy chủ đọc từ JWT), người dùng chọn
 * một hoặc nhiều lý do có sẵn và có thể viết thêm mô tả; "Lý do khác" thì bắt buộc mô tả.
 * Gửi xong, máy chủ gửi email về hộp thư kiểm duyệt; hộp thoại chuyển sang trạng thái "Đã gửi".
 * Dùng lại khung .mod-dialog của components/moderation để giống các hộp thoại kiểm duyệt khác.
 */
import { modIcon } from '/components/moderation/moderation.js';
import { sendReport } from '/services/api/reports.js';
import { getCachedUser } from '/utils/auth.js';
import { el } from '/utils/dom.js';
import { toVietnameseMessage } from '/utils/errors.js';
import { initials } from '/utils/format.js';
import { t } from '/utils/i18n.js';

// Giới hạn mô tả thêm, khớp MAX_DETAILS ở máy chủ.
const MAX_DETAILS = 1000;

// Lý do theo từng loại nội dung. Mã (bên trái) phải khớp bảng lý do ở backend/src/domains/report/service.rs.
const REASONS = {
  post: [
    ['spam', t('Spam hoặc quảng cáo')],
    ['sexual', t('Nội dung phản cảm, khiêu dâm')],
    ['hate', t('Kích động vùng miền, phân biệt quốc tịch hoặc dân tộc')],
    ['harassment', t('Quấy rối, xúc phạm người khác')],
    ['misinformation', t('Thông tin sai sự thật')],
    ['violence', t('Bạo lực hoặc nguy hiểm')],
    ['illegal', t('Vi phạm pháp luật hoặc bản quyền')],
    ['other', t('Lý do khác')],
  ],
  comment: [
    ['spam', t('Spam hoặc quảng cáo')],
    ['sexual', t('Nội dung phản cảm, khiêu dâm')],
    ['hate', t('Kích động vùng miền, phân biệt quốc tịch hoặc dân tộc')],
    ['harassment', t('Quấy rối, xúc phạm người khác')],
    ['misinformation', t('Thông tin sai sự thật')],
    ['off_topic', t('Lạc đề, phá rối cuộc thảo luận')],
    ['other', t('Lý do khác')],
  ],
  user: [
    ['impersonation', t('Giả mạo người khác')],
    ['spam', t('Tài khoản spam hoặc quảng cáo')],
    ['harassment', t('Quấy rối, đe doạ người khác')],
    ['hate', t('Kích động thù ghét vùng miền, quốc tịch hoặc dân tộc')],
    ['inappropriate_profile', t('Ảnh đại diện hoặc hồ sơ không phù hợp')],
    ['underage', t('Có vẻ chưa đủ 16 tuổi')],
    ['other', t('Lý do khác')],
  ],
};

// Tiêu đề hộp thoại theo loại nội dung.
const TITLES = {
  post: t('Báo cáo bài viết'),
  comment: t('Báo cáo bình luận'),
  user: t('Báo cáo người dùng'),
};

// Đếm số lần mở để mỗi hộp thoại có id riêng cho aria-labelledby và nhãn.
let dialogCount = 0;

/** Đếm ký tự theo điểm mã (emoji tính là 1), giống cách máy chủ đếm. */
function countChars(text) {
  return [...text].length;
}

/**
 * Khối "Người báo cáo": avatar chữ cái, tên, @username và email của tài khoản đang đăng nhập.
 * Chỉ để người dùng biết báo cáo gửi dưới tên ai; máy chủ không tin dữ liệu này mà đọc từ JWT.
 */
function createReporterBox(user) {
  const name = user.displayname || '@' + user.username;
  return el('section', { className: 'report-reporter', 'aria-label': t('Người báo cáo') },
    el('span', { className: 'report-reporter__avatar', 'aria-hidden': 'true' }, initials(name)),
    el('div', { className: 'report-reporter__text' },
      el('p', { className: 'report-reporter__label' }, t('Người báo cáo')),
      el('p', { className: 'report-reporter__name' }, name,
        user.username ? el('span', { className: 'report-reporter__handle' }, ' @' + user.username) : null),
      user.email ? el('p', { className: 'report-reporter__email' }, user.email) : null),
    el('p', { className: 'report-reporter__note' }, modIcon('lock', 14), t('Lấy từ tài khoản đang đăng nhập')));
}

/**
 * Mở hộp thoại báo cáo.
 * @param {object} options Thông tin nội dung bị báo cáo.
 * @param {'post'|'comment'|'user'} options.targetType Loại nội dung.
 * @param {string} options.targetId Mã nội dung.
 * @param {string} [options.summary] Một dòng tóm tắt nội dung (tiêu đề bài, đoạn bình luận, tên người dùng).
 * @returns {Promise<boolean>} true nếu đã gửi báo cáo thành công.
 */
export function openReportDialog({ targetType, targetId, summary = '' }) {
  return new Promise(resolve => {
    const user = getCachedUser();
    const id = ++dialogCount;
    const titleId = 'report-title-' + id;
    const detailsId = 'report-details-' + id;
    const hintId = 'report-hint-' + id;
    let sent = false;
    let done = false;

    // Danh sách lý do: mỗi dòng là checkbox thật (bàn phím và trình đọc màn hình dùng được).
    const reasons = el('fieldset', { className: 'report-reasons' },
      el('legend', { className: 'report-reasons__legend' }, t('Lý do báo cáo'),
        el('span', { className: 'report-reasons__hint' }, ' ' + t('(chọn một hoặc nhiều)'))));
    REASONS[targetType].forEach(([code, label], index) => {
      reasons.append(el('label', { className: 'checkbox report-reasons__item' },
        el('input', { type: 'checkbox', className: 'checkbox__input', name: 'reason', value: code, 'data-autofocus': index === 0 ? '' : null }),
        el('span', { className: 'checkbox__box', 'aria-hidden': 'true' }),
        el('span', {}, label)));
    });

    // Ô mô tả thêm: không bắt buộc, trừ khi chọn "Lý do khác".
    const required = el('span', { className: 'report-details__required', hidden: true }, ' *');
    const labelText = el('span', {}, t('Mô tả thêm'));
    const optional = el('span', { className: 'report-details__optional' }, ' ' + t('(không bắt buộc)'));
    const details = el('textarea', { id: detailsId, className: 'input report-details__input', rows: 4, maxlength: MAX_DETAILS,
      placeholder: t('Ví dụ: đoạn nào vi phạm, đã xảy ra bao lâu…'), 'aria-describedby': hintId });
    const counter = el('span', { className: 'report-details__counter', 'aria-live': 'polite' }, '0/' + MAX_DETAILS);
    const hint = el('span', { id: hintId, className: 'report-details__hint' }, t('Bắt buộc khi chọn "Lý do khác".'));
    const detailsBlock = el('div', { className: 'report-details' },
      el('label', { className: 'report-details__label', for: detailsId }, labelText, required, optional),
      details,
      el('div', { className: 'report-details__meta' }, hint, counter));

    // Ghi chú quyền riêng tư: người bị báo cáo không thấy ai đã gửi.
    const privacy = el('p', { className: 'report-privacy' }, modIcon('shield', 16),
      el('span', {}, t('Báo cáo được gửi riêng tới đội kiểm duyệt Etsubi qua email. Người bị báo cáo không biết ai đã gửi.')));

    const error = el('p', { className: 'mod-dialog__error', role: 'alert', hidden: true });
    const submit = el('button', { type: 'submit', className: 'mod-dialog__confirm' }, modIcon('flag', 16), el('span', {}, t('Gửi báo cáo')));
    const cancel = el('button', { type: 'button', className: 'mod-dialog__cancel' }, t('Huỷ'));
    const close = el('button', { type: 'button', className: 'mod-dialog__close', 'aria-label': t('Đóng') }, modIcon('x', 20));
    const footer = el('div', { className: 'mod-dialog__footer' }, cancel, submit);
    const body = el('div', { className: 'report-body' }, createReporterBox(user || {}), reasons, detailsBlock, privacy);

    const form = el('form', { className: 'mod-dialog__panel', method: 'dialog', novalidate: true },
      el('div', { className: 'mod-dialog__head' },
        el('span', { className: 'mod-dialog__icon' }, modIcon('flag', 22)),
        el('div', { className: 'mod-dialog__titles' },
          el('h2', { id: titleId, className: 'mod-dialog__title' }, TITLES[targetType]),
          summary ? el('p', { className: 'mod-dialog__subtitle report-summary' }, summary) : null),
        close),
      body, error, footer);
    const dialog = el('dialog', { className: 'mod-dialog report-dialog', 'aria-labelledby': titleId }, form);

    /** Mã các lý do đang được chọn. */
    function selectedReasons() {
      return [...reasons.querySelectorAll('input:checked')].map(input => input.value);
    }

    /** Cập nhật bộ đếm, dấu * bắt buộc và trạng thái nút Gửi theo lựa chọn hiện tại. */
    function sync() {
      const chosen = selectedReasons();
      const needsDetails = chosen.includes('other');
      const length = countChars(details.value.trim());
      counter.textContent = countChars(details.value) + '/' + MAX_DETAILS;
      required.hidden = !needsDetails;
      optional.hidden = needsDetails;
      details.required = needsDetails;
      const missingDetails = needsDetails && length === 0;
      details.setAttribute('aria-invalid', String(missingDetails && details.dataset.touched === 'true'));
      hint.classList.toggle('is-error', missingDetails && details.dataset.touched === 'true');
      submit.disabled = submit.classList.contains('is-loading') || chosen.length === 0 || missingDetails || length > MAX_DETAILS;
    }

    /** Đóng hộp thoại, gỡ khỏi trang và trả kết quả cho nơi gọi. */
    function finish() {
      if (done) {
        return;
      }
      done = true;
      dialog.close();
      dialog.remove();
      resolve(sent);
    }

    /** Thay nội dung bằng trạng thái "Đã gửi báo cáo" và một nút Đóng. */
    function showSuccess() {
      const closeButton = el('button', { type: 'button', className: 'mod-dialog__confirm' }, t('Đóng'));
      closeButton.addEventListener('click', finish);
      body.replaceChildren(el('div', { className: 'report-success', role: 'status' },
        el('span', { className: 'report-success__icon', 'aria-hidden': 'true' }, modIcon('check', 28)),
        el('p', { className: 'report-success__title' }, t('Đã gửi báo cáo')),
        el('p', { className: 'report-success__text' }, user?.email
          ? t('Cảm ơn bạn. Đội kiểm duyệt sẽ xem xét và có thể trả lời qua email {email}.', { email: user.email })
          : t('Cảm ơn bạn. Đội kiểm duyệt sẽ xem xét sớm.'))));
      error.hidden = true;
      footer.replaceChildren(closeButton);
      closeButton.focus();
    }

    /** Bấm Gửi: gửi báo cáo; lỗi thì hiện ngay trong hộp thoại để người dùng sửa hoặc thử lại. */
    async function handleSubmit(event) {
      event.preventDefault();
      details.dataset.touched = 'true';
      sync();
      if (submit.disabled || sent) {
        return;
      }
      submit.classList.add('is-loading');
      submit.disabled = true;
      submit.lastChild.textContent = t('Đang gửi…');
      error.hidden = true;
      try {
        await sendReport({ targetType, targetId, reasons: selectedReasons(), details: details.value });
        sent = true;
        showSuccess();
      } catch (problem) {
        error.textContent = toVietnameseMessage(problem);
        error.hidden = false;
        submit.classList.remove('is-loading');
        submit.lastChild.textContent = t('Gửi báo cáo');
        sync();
      }
    }

    form.addEventListener('change', sync);
    form.addEventListener('input', sync);
    // Rời ô mô tả mà vẫn trống khi bắt buộc thì mới tô đỏ, không báo lỗi ngay lúc vừa chọn lý do.
    details.addEventListener('blur', () => {
      details.dataset.touched = 'true';
      sync();
    });
    form.addEventListener('submit', handleSubmit);
    cancel.addEventListener('click', finish);
    close.addEventListener('click', finish);
    // Escape (sự kiện cancel của dialog) cũng là đóng.
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      finish();
    });

    document.body.append(dialog);
    sync();
    dialog.showModal();
    // Focus vào lý do đầu tiên để chọn ngay bằng bàn phím.
    form.querySelector('[data-autofocus]')?.focus();
  });
}
