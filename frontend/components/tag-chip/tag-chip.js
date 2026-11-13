/** Chip thẻ dùng chung cho liên kết tìm kiếm, bộ lọc và thẻ có thể xoá trong ô nhập. */
import { el } from '/utils/dom.js';
import { searchUrl } from '/utils/routes.js';
import { wrapJapanese } from '/utils/text.js';

/**
 * Tạo chip có ngữ nghĩa phù hợp; mọi tên và số đều đi qua nút văn bản an toàn.
 * @param {object} options Tên thẻ, trạng thái, số bài và các hàm xử lý thao tác.
 * @returns {HTMLElement} Liên kết, nút bật tắt hoặc span chứa nút xoá độc lập.
 */
export function createTagChip({ name, state = 'default', count, href, onClick, onRemove }) {
  const removable = state === 'removable';
  const toggle = !removable && !href && typeof onClick === 'function';
  const tag = removable ? 'span' : toggle ? 'button' : 'a';
  const chip = el(tag, {
    className: 'tag-chip tag-chip--' + state,
    href: tag === 'a' ? href || searchUrl({ tags: [name] }) : null,
    type: toggle ? 'button' : null,
    'aria-pressed': toggle ? String(state === 'selected') : null,
    'data-tag-name': name,
  });
  // Dấu chọn bổ sung hình dạng để chip đang bật không chỉ khác nhau bằng màu nền.
  if (state === 'selected') {
    chip.append(el('img', { src: '/assets/icons/chip-check.svg', alt: '', width: 14, height: 14 }));
  }
  chip.append(el('span', { className: 'tag-chip__label' },
    el('span', { className: 'tag-chip__hash' }, '#'), wrapJapanese(name)
  ));
  if (count != null) {
    chip.append(el('span', { className: 'tag-chip__count' }, count));
  }
  if (removable) {
    const remove = el('button', {
      type: 'button',
      className: 'tag-chip__remove',
      'aria-label': 'Bỏ tag #' + name,
    }, el('img', { src: '/assets/icons/chip-x.svg', alt: '', width: 14, height: 14 }));
    /** Gửi tên thẻ cần xoá để vùng chứa cập nhật trạng thái của chính nó. */
    function removeTag(event) {
      event.stopPropagation();
      onRemove?.(name);
    }
    remove.addEventListener('click', removeTag);
    chip.append(remove);
  } else if (onClick) {
    /** Chuyển thao tác nhấn cho trang; liên kết vẫn giữ href để mở tab mới được. */
    function clickTag(event) {
      onClick(event, name);
    }
    chip.addEventListener('click', clickTag);
  }
  return chip;
}
