/** Bản đồ dùng Leaflet vendored, chỉ nạp khi thật sự cần hiển thị bản đồ. */
import { editorIcon } from '/components/rich-editor/rich-editor.js';

/** Tạo map không hiệu ứng; icon DOM cố định tránh marker xanh mặc định của Leaflet. */
export async function createPlaceMap(container, { latitude = 10.7769, longitude = 106.7009, zoom = 12, interactive = true, onMove = () => {} } = {}) {
  const L = await import('/vendor/leaflet/leaflet-src.esm.js');
  const map = L.map(container, { zoomControl: false, dragging: interactive, scrollWheelZoom: interactive,
    doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: interactive,
    zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false, inertia: false, attributionControl: true });
  map.setView([latitude, longitude], zoom, { animate: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }).addTo(map);
  map.attributionControl.setPrefix(false);
  // Zoom góc phải trên, CSS chừa chỗ cho nút toàn màn hình ngay phía trên.
  if (interactive) L.control.zoom({ position: 'topright' }).addTo(map);
  // Phím mũi tên di chuyển tức thì, tránh pan hoạt ảnh mặc định của Leaflet.
  function moveByKeyboard(event) {
    const offsets = { ArrowLeft: [-80, 0], ArrowRight: [80, 0], ArrowUp: [0, -80], ArrowDown: [0, 80] };
    if (event.target !== container || !offsets[event.key]) return;
    event.preventDefault();
    map.panBy(offsets[event.key], { animate: false });
  }
  if (interactive) {
    container.tabIndex = 0;
    container.addEventListener('keydown', moveByKeyboard);
  }
  const pin = editorIcon('pin', 36);
  const icon = L.divIcon({ className: 'place-map__pin', html: pin, iconSize: [36, 46], iconAnchor: [18, 46] });
  let marker = null;
  /** Cập nhật ghim không pan hoạt ảnh, tuỳ chọn đưa tâm về kết quả tìm kiếm. */
  function setPoint(lat, lon, center = false) {
    if (!marker) {
      marker = L.marker([lat, lon], { icon, draggable: interactive, keyboard: interactive, title: 'Địa điểm đã chọn', autoPan: false }).addTo(map);
      marker.on('dragend', () => { const point = marker.getLatLng(); onMove(point.lat, point.lng); });
    } else marker.setLatLng([lat, lon]);
    if (center) map.setView([lat, lon], 16, { animate: false });
  }
  if (!interactive) setPoint(latitude, longitude);
  if (interactive) map.on('click', event => onMove(event.latlng.lat, event.latlng.lng));
  return { map, setPoint, destroy: () => { container.removeEventListener('keydown', moveByKeyboard); map.remove(); } };
}
