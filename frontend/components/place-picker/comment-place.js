/** Hiển thị địa điểm bình luận: chỉ nạp bản đồ và tra ngược khi người đọc mở chip. */
import { el } from '/utils/dom.js';
import { editorIcon } from '/components/rich-editor/rich-editor.js';
import { createPlaceMap } from '/components/place-picker/place-map.js';
import { reversePlace } from '/services/geo/nominatim.js';
import { t } from '/utils/i18n.js';
import { sovereignPlace } from '/services/geo/vn-sovereignty.js';

/** Không dựng giao diện khi thiếu toạ độ thật; caller dọn map khi thay danh sách bình luận. */
export function createCommentPlace(comment) {
  const { latitude, longitude } = comment;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  let view = null;
  let loaded = false;
  let disposed = false;
  const controller = new AbortController();
  // Tên và địa chỉ đã lưu trong Hoàng Sa, Trường Sa luôn hiển thị theo Việt Nam.
  const saved = sovereignPlace({ latitude, longitude, name: comment.place_name || t('Vị trí đã chọn'),
    address: comment.place?.address || comment.address || comment.place?.city || comment.city || '' });
  const nameText = saved.name;
  const addressText = saved.address;
  const name = el('strong', {}, nameText);
  const city = el('span', { className: 'comment-place__city' }, addressText ? '· ' + addressText.split(',')[0] : '');
  const chip = el('button', { type: 'button', className: 'comment-place__chip', 'aria-expanded': 'false' }, editorIcon('pin', 14), name, city, editorIcon('chevron', 14));
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(latitude + ',' + longitude);
  const map = el('div', { className: 'place-map comment-place__map', 'aria-label': t('Bản đồ địa điểm bình luận') });
  const fullName = el('strong', {}, nameText);
  const address = el('p', { className: 'comment-place__address' }, addressText);
  const card = el('div', { className: 'comment-place__card', hidden: true },
    el('div', { className: 'post-map' }, map, el('a', { className: 'post-map__open', href: mapsUrl, target: '_blank', rel: 'noopener noreferrer' }, t('Mở trong Maps ↗'))),
    fullName, address, el('a', { className: 'comment-place__link', href: mapsUrl, target: '_blank', rel: 'noopener noreferrer' }, t('Xem trên Google Maps ↗')));
  const root = el('div', { className: 'comment-place' }, chip, card);
  /** Mở lần đầu mới tải map/reverse; lần sau chỉ đổi hidden và đo lại kích thước. */
  async function toggle() {
    const expanded = chip.getAttribute('aria-expanded') !== 'true';
    chip.setAttribute('aria-expanded', String(expanded)); card.hidden = !expanded;
    if (!expanded) return;
    if (loaded) { view?.resize(); return; }
    loaded = true;
    // Hai tác vụ độc lập: lỗi tile hoặc reverse vẫn giữ tên và liên kết Maps đọc được.
    void createPlaceMap(map, { latitude, longitude, zoom: 16, interactive: false }).then(result => {
      if (disposed) { result.destroy(); return; }
      view = result; view.resize();
    }).catch(() => { if (!disposed) map.textContent = t('Không tải được bản đồ.'); });
    try {
      const place = await reversePlace(latitude, longitude, { signal: controller.signal });
      if (disposed || !place) return;
      if (!comment.place_name && place.name) { name.textContent = place.name; fullName.textContent = place.name; }
      if (!addressText && place.address) { address.textContent = place.address; city.textContent = '· ' + place.address.split(',')[0]; }
    } catch {
      // Tên và địa chỉ hiện có vẫn dùng được khi dịch vụ tra ngược không phản hồi.
    }
  }
  chip.addEventListener('click', toggle);
  return { root, destroy: () => { disposed = true; controller.abort(); view?.destroy(); } };
}
