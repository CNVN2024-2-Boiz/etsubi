/** Ảnh xem trước và chip địa điểm dùng chung, không giả dữ liệu đã được máy chủ lưu. */
import { el } from '/utils/dom.js';
import { editorIcon } from '/components/rich-editor/rich-editor.js';

/** Chip có tên đậm, toạ độ bốn số lẻ và nút bỏ địa điểm có nhãn đọc được. */
export function createPlaceChip(place, onRemove) {
  const remove = el('button', { type: 'button', className: 'place-chip__remove', 'aria-label': 'Bỏ địa điểm' }, editorIcon('close', 14));
  remove.addEventListener('click', onRemove);
  return el('span', { className: 'place-chip' }, editorIcon('pin', 16), el('strong', {}, place.name),
    el('span', { className: 'place-chip__coords' }, place.latitude.toFixed(4) + ', ' + place.longitude.toFixed(4)), remove);
}

/** Quản lý tối đa bốn blob URL, luôn thu hồi khi bỏ ảnh hoặc xoá bản nháp. */
export function createImagePreviews(container, { onChange = () => {}, onError = () => {} } = {}) {
  let images = [];
  const picker = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, 'aria-label': 'Chọn ảnh xem trước' });
  container.append(picker);
  container.hidden = true;
  /** Vẽ ảnh và nút gỡ bằng DOM, tên tệp chỉ đi vào alt và nhãn chữ. */
  function render() {
    container.replaceChildren(picker);
    container.hidden = !images.length;
    for (const image of images) {
      const remove = el('button', { type: 'button', className: 'rich-media__remove', 'aria-label': 'Bỏ ảnh ' + image.file.name }, editorIcon('close', 14));
      // Bỏ ảnh giải phóng ngay bộ nhớ blob của trình duyệt.
      remove.addEventListener('click', () => {
        URL.revokeObjectURL(image.url);
        images = images.filter(item => item !== image);
        render();
        onChange();
      });
      container.append(el('span', { className: 'rich-media__thumbnail' }, el('img', { src: image.url, alt: image.file.name, width: 96, height: 72 }), remove));
    }
  }
  // Chỉ nhận ảnh nhỏ để việc xem trước không chiếm quá nhiều bộ nhớ; không gửi tệp qua API.
  picker.addEventListener('change', () => {
    for (const file of picker.files || []) {
      if (!file.type.startsWith('image/')) { onError('Vui lòng chọn tệp ảnh.'); continue; }
      if (file.size > 5 * 1024 * 1024) { onError('Mỗi ảnh phải có dung lượng không quá 5 MB.'); continue; }
      if (images.length >= 4) { onError('Bạn chỉ có thể chọn tối đa 4 ảnh.'); break; }
      images.push({ file, url: URL.createObjectURL(file) });
    }
    picker.value = '';
    render();
    onChange();
  });
  /** Xoá ảnh sau Huỷ hoặc gửi thành công, không giữ blob URL đã hết dùng. */
  function clear() {
    images.forEach(image => URL.revokeObjectURL(image.url));
    images = [];
    render();
    onChange();
  }
  return { open: () => picker.click(), clear, hasImages: () => images.length > 0 };
}
