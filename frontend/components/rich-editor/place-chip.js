/** Chip địa điểm dùng chung cho các bản nháp, không trộn vào nội dung HTML. */
import { el } from '/utils/dom.js';
import { editorIcon } from '/components/rich-editor/rich-editor.js';

/** Chip có tên đậm, toạ độ bốn số lẻ và nút bỏ địa điểm có nhãn đọc được. */
export function createPlaceChip(place, onRemove) {
  const remove = el('button', { type: 'button', className: 'place-chip__remove', 'aria-label': 'Bỏ địa điểm' }, editorIcon('close', 14));
  remove.addEventListener('click', onRemove);
  return el('span', { className: 'place-chip' }, editorIcon('pin', 16), el('strong', {}, place.name),
    el('span', { className: 'place-chip__coords' }, place.latitude.toFixed(4) + ', ' + place.longitude.toFixed(4)), remove);
}

