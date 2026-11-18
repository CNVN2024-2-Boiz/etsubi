/** Hộp thoại ảnh HTTPS dùng chung cho bài viết và bình luận, không tải tệp lên máy chủ. */
import { el } from '/utils/dom.js';
import { safeImageUrl, imageDimension } from '/utils/rich-text.js';
import { editorIcon } from '/components/rich-editor/rich-editor.js';
import { t } from '/utils/i18n.js';

let imageDialogId = 0;

/** Mở dialog có xem trước thật; chỉ trả dữ liệu khi ảnh của URL hiện tại tải thành công. */
export function openImageDialog(existing = null) {
  return new Promise(resolve => {
    const id = 'image-dialog-' + (++imageDialogId);
    const dialog = el('dialog', { className: 'image-dialog', 'data-image-dialog': '', 'aria-labelledby': id + '-title' });
    const close = el('button', { type: 'button', className: 'image-dialog__close', 'aria-label': t('Đóng') }, editorIcon('close', 24));
    const url = el('input', { id: id + '-url', type: 'url', className: 'image-dialog__url', placeholder: 'https://…',
      autocomplete: 'off', 'aria-describedby': id + '-url-hint ' + id + '-error' });
    const error = el('p', { id: id + '-error', className: 'field__hint field__hint--error', role: 'alert' });
    const preview = el('div', { className: 'image-dialog__preview' });
    const caption = el('p', { className: 'image-dialog__caption', role: 'status' });
    const alt = el('input', { id: id + '-alt', type: 'text', className: 'input', maxlength: 300, 'aria-describedby': id + '-alt-hint' });
    const width = el('input', { id: id + '-width', type: 'number', className: 'image-dialog__number', min: 1, max: 4000, step: 1, 'aria-describedby': id + '-dimensions-hint ' + id + '-dimensions-error' });
    const height = el('input', { id: id + '-height', type: 'number', className: 'image-dialog__number', min: 1, max: 4000, step: 1, 'aria-describedby': id + '-dimensions-hint ' + id + '-dimensions-error' });
    const dimensionError = el('p', { id: id + '-dimensions-error', className: 'field__hint field__hint--error', role: 'alert' });
    const lock = el('button', { type: 'button', className: 'image-dialog__lock', 'aria-label': t('Giữ tỉ lệ ảnh'), 'aria-pressed': 'true' }, editorIcon('lock'));
    const cancel = el('button', { type: 'button', className: 'btn btn--secondary' }, t('Huỷ'));
    const apply = el('button', { type: 'submit', className: 'btn btn--primary', disabled: true }, existing ? t('Lưu') : t('Chèn ảnh'));
    let loadedUrl = null;
    let ratio = null;
    let version = 0;
    let finished = false;

    /** Nhãn trường rõ ràng; mọi dữ liệu người dùng chỉ gán qua value/textContent. */
    function field(label, input, hint = null) {
      return el('div', { className: 'field' }, el('label', { className: 'field__label', for: input.id }, label), input, hint);
    }
    /** Ô kích thước có đơn vị px bên ngoài để giá trị luôn là số nguyên. */
    function dimension(label, input) {
      return el('div', { className: 'field' }, el('label', { className: 'field__label', for: input.id }, label),
        el('div', { className: 'image-dialog__dimension' }, input, el('span', {}, 'px')));
    }
    const form = el('form', { className: 'image-dialog__form', novalidate: true },
      el('div', { className: 'image-dialog__heading' }, el('h2', { id: id + '-title', className: 't-display' }, existing ? t('Sửa ảnh') : t('Chèn ảnh')), close),
      el('div', { className: 'field' }, el('label', { className: 'field__label', for: url.id }, t('Đường dẫn ảnh')),
        el('div', { className: 'image-dialog__url-wrap' }, editorIcon('link'), url),
        el('p', { id: id + '-url-hint', className: 'field__hint' }, t('Dán link ảnh bắt đầu bằng https://. Ảnh không được lưu trên máy chủ Etsubi.')), error),
      preview, caption,
      field(t('Mô tả ảnh (alt)'), alt, el('p', { id: id + '-alt-hint', className: 'field__hint' }, t('Giúp trình đọc màn hình và hiện khi ảnh không tải được.'))),
      el('div', { className: 'image-dialog__dimensions' }, dimension(t('Rộng'), width), dimension(t('Cao'), height), lock),
      el('p', { id: id + '-dimensions-hint', className: 'field__hint' }, t('Để trống thì ảnh tự co theo khung (tối đa 100% chiều rộng). Nút ổ khoá giữ đúng tỉ lệ khi đổi một chiều.')), dimensionError,
      el('div', { className: 'image-dialog__actions' }, cancel, apply));
    dialog.append(form);

    /** Kích thước bỏ trống được phép; giá trị lỗi chặn lưu thay vì tự ép vào khoảng. */
    function sync() {
      const dimensionsValid = [width, height].every(input => !input.validity.badInput && (!input.value || imageDimension(input.value)));
      apply.disabled = loadedUrl !== safeImageUrl(url.value) || !loadedUrl || !dimensionsValid;
      for (const input of [width, height]) input.setAttribute('aria-invalid', String(input.validity.badInput || Boolean(input.value && !imageDimension(input.value))));
      dimensionError.textContent = dimensionsValid ? '' : t('Rộng và cao phải là số nguyên từ 1 đến 4000 px, hoặc để trống.');
    }
    /** Báo lỗi URL hoặc ảnh tải lỗi bằng cùng một thông báo tiếng Việt. */
    function fail() {
      loadedUrl = null;
      url.setAttribute('aria-invalid', 'true');
      error.textContent = t('Đường dẫn phải bắt đầu bằng https:// và trỏ tới một ảnh.');
      caption.textContent = t('Ảnh xem trước');
      sync();
    }
    /** Mỗi lần nhập tạo ảnh mới và đánh số để sự kiện của URL cũ không bật nhầm nút lưu. */
    function loadPreview() {
      const current = ++version;
      loadedUrl = null; ratio = null;
      preview.replaceChildren(editorIcon('image', 32));
      caption.textContent = t('Ảnh xem trước');
      error.textContent = '';
      url.removeAttribute('aria-invalid');
      sync();
      const src = safeImageUrl(url.value);
      if (!src) { if (url.value) fail(); return; }
      const image = el('img', { alt: '', referrerpolicy: 'no-referrer', decoding: 'async' });
      // Đăng ký trước khi gán src để không bỏ lỡ ảnh đã có trong bộ nhớ đệm.
      image.addEventListener('load', () => {
        if (finished || current !== version) return;
        loadedUrl = src;
        ratio = image.naturalWidth / image.naturalHeight;
        preview.replaceChildren(image);
        caption.textContent = t('Ảnh xem trước · {width} × {height}', { width: image.naturalWidth, height: image.naturalHeight });
        sync();
      });
      image.addEventListener('error', () => { if (!finished && current === version) fail(); });
      image.setAttribute('src', src);
    }
    /** Thay một chiều giữ đúng tỉ lệ tự nhiên khi khoá đang bật; vượt giới hạn sẽ được báo lỗi. */
    function resize(input, other, multiply) {
      if (lock.getAttribute('aria-pressed') === 'true' && ratio && imageDimension(input.value)) {
        other.value = String(Math.round(Number(input.value) * (multiply ? ratio : 1 / ratio)));
      }
      sync();
    }
    /** Kết thúc trực tiếp, giải phóng dialog và vô hiệu hoá mọi sự kiện tải đến trễ. */
    function finish(result) {
      if (finished) return;
      finished = true; version++;
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(result);
    }
    // Các nút và Escape đều trả kết quả ngay, không phụ thuộc riêng sự kiện close.
    url.addEventListener('input', loadPreview);
    width.addEventListener('input', () => resize(width, height, false));
    height.addEventListener('input', () => resize(height, width, true));
    lock.addEventListener('click', () => lock.setAttribute('aria-pressed', String(lock.getAttribute('aria-pressed') !== 'true')));
    cancel.addEventListener('click', () => finish(null));
    close.addEventListener('click', () => finish(null));
    dialog.addEventListener('cancel', event => { event.preventDefault(); event.stopPropagation(); finish(null); });
    dialog.addEventListener('close', () => finish(null));
    form.addEventListener('submit', event => {
      event.preventDefault(); sync();
      if (apply.disabled) return;
      finish({ src: loadedUrl, alt: Array.from(alt.value).slice(0, 300).join(''),
        ...(imageDimension(width.value) ? { width: imageDimension(width.value) } : {}),
        ...(imageDimension(height.value) ? { height: imageDimension(height.value) } : {}) });
    });
    // Giá trị sửa ảnh được giữ nguyên; preview vẫn phải tải thành công trước khi cho lưu.
    url.value = existing?.src || ''; alt.value = existing?.alt || '';
    width.value = existing?.width || ''; height.value = existing?.height || '';
    document.body.append(dialog); dialog.showModal(); loadPreview(); url.focus();
  });
}
