/** Bản đồ vector dùng MapLibre vendored, chỉ nạp khi thật sự cần hiển thị bản đồ. */
import { editorIcon } from '/components/rich-editor/rich-editor.js';
import { t, currentLanguage } from '/utils/i18n.js';
import { ARCHIPELAGOS, ISLANDS, EAST_SEA, EAST_SEA_WATERS, FOREIGN_ADMIN_NAMES } from '/services/geo/vn-sovereignty.js';

// Style OpenFreeMap (dữ liệu OpenStreetMap), không cần khoá API; style được chỉnh lại trước khi vẽ.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const SOVEREIGNTY_SOURCE = 'etsubi-vn-sovereignty';
let baseStyle = null;

/** Tải style gốc một lần mỗi trang; lỗi mạng xoá cache để lần mở sau thử lại. */
function loadBaseStyle() {
  baseStyle ??= fetch(STYLE_URL, { credentials: 'omit' })
    .then(response => { if (!response.ok) throw new Error('Map style ' + response.status); return response.json(); })
    .catch(error => { baseStyle = null; throw error; });
  return baseStyle;
}

/** Tên theo ngôn ngữ giao diện, thiếu bản dịch thì giữ cách hiển thị gốc của style. */
function localizedName(original) {
  const lang = currentLanguage();
  const own = lang === 'en' ? [['get', 'name:en'], ['get', 'name_en']] : [['get', 'name:' + lang]];
  return ['coalesce', ...own, original];
}

/**
 * Hiển thị đúng chủ quyền Việt Nam: ẩn mọi nhãn và đường ranh giới nằm trong vùng Hoàng Sa, Trường Sa,
 * ẩn tên đơn vị hành chính nước ngoài đặt trên các quần đảo và nhãn không có tên tiếng Việt ngoài khơi
 * Biển Đông, rồi vẽ nhãn Việt Nam của Etsubi lên trên cùng.
 */
function sovereignStyle(base) {
  const style = structuredClone(base);
  const areas = { type: 'MultiPolygon', coordinates: ARCHIPELAGOS.map(area => [area.ring]) };
  const outsideAreas = ['!', ['within', areas]];
  const notForeignAdmin = ['!', ['in', ['coalesce', ['get', 'name'], ''], ['literal', FOREIGN_ADMIN_NAMES]]];
  const vietnameseAtSea = ['any', ['!', ['within', { type: 'Polygon', coordinates: [EAST_SEA_WATERS] }]], ['has', 'name:vi']];
  let seaTemplate = null;
  let archipelagoTemplate = null;
  let islandTemplate = null;
  for (const layer of style.layers) {
    const labels = layer.type === 'symbol';
    const borders = layer.type === 'line' && layer['source-layer'] === 'boundary';
    if (!labels && !borders) continue;
    const rules = [outsideAreas];
    if (labels) rules.push(notForeignAdmin, vietnameseAtSea);
    // Tên biển gốc được thay bằng nhãn Biển Đông riêng bên dưới.
    if (layer['source-layer'] === 'water_name') rules.push(['!=', ['coalesce', ['get', 'name_en'], ['get', 'name:en'], ''], 'South China Sea']);
    layer.filter = ['all', layer.filter ?? true, ...rules];
    const textField = layer.layout?.['text-field'];
    if (labels && JSON.stringify(textField ?? '').includes('"name')) layer.layout['text-field'] = localizedName(textField);
    if (layer.id === 'water_name_point_label') seaTemplate = layer;
    if (layer.id === 'label_country_3') archipelagoTemplate = layer;
    if (layer.id === 'label_village') islandTemplate = layer;
  }
  // Ranh giới cấp vùng, tỉnh và ranh giới tranh chấp được vẽ ngay dưới lớp nước: đoạn nào chạy trên biển
  // (ví dụ đường bao vùng biển nước ngoài kéo qua Trường Sa) bị nước che, đoạn trên đất liền vẫn hiện.
  const underWater = style.layers.filter(layer => ['boundary_3', 'boundary_disputed'].includes(layer.id));
  style.layers = style.layers.filter(layer => !underWater.includes(layer));
  style.layers.splice(Math.max(0, style.layers.findIndex(layer => layer.id === 'water')), 0, ...underWater);
  // Nhãn riêng dùng lại kiểu chữ và màu của style gốc để hoà vào bản đồ.
  // Phần "(Việt Nam)" luôn xuống dòng riêng dưới tên quần đảo.
  const point = (label, kind, anchor) => ({ type: 'Feature', properties: { label: t(label).replace(/\s*([（(])/, '\n$1'), kind },
    geometry: { type: 'Point', coordinates: anchor } });
  style.sources[SOVEREIGNTY_SOURCE] = { type: 'geojson', data: { type: 'FeatureCollection', features: [
    ...ARCHIPELAGOS.map(area => point(area.label, 'archipelago', area.anchor)),
    point(EAST_SEA.label, 'sea', EAST_SEA.anchor),
    // Tên đảo là địa danh Việt Nam, giữ nguyên ở mọi ngôn ngữ giao diện nên không qua t().
    ...ISLANDS.map(island => ({ type: 'Feature', properties: { label: island.name, kind: 'island' },
      geometry: { type: 'Point', coordinates: [island.longitude, island.latitude] } })),
  ] } };
  style.layers.push({
    id: 'etsubi-east-sea-label', type: 'symbol', source: SOVEREIGNTY_SOURCE, filter: ['==', ['get', 'kind'], 'sea'],
    layout: { ...seaTemplate?.layout, 'text-field': ['get', 'label'], 'text-max-width': 8 },
    paint: { ...seaTemplate?.paint },
  }, {
    id: 'etsubi-archipelago-label', type: 'symbol', source: SOVEREIGNTY_SOURCE, filter: ['==', ['get', 'kind'], 'archipelago'],
    // Luôn hiện, không bị nhãn khác chen mất, ở mọi mức zoom.
    layout: { ...archipelagoTemplate?.layout, 'text-field': ['get', 'label'], 'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 8, 15],
      'text-max-width': 9, 'text-allow-overlap': true, 'text-ignore-placement': true },
    paint: { ...archipelagoTemplate?.paint },
  }, {
    // Tên từng đảo chỉ hiện khi đã phóng to đủ gần để thấy đảo.
    id: 'etsubi-island-label', type: 'symbol', source: SOVEREIGNTY_SOURCE, filter: ['==', ['get', 'kind'], 'island'], minzoom: 9,
    layout: { ...islandTemplate?.layout, 'text-field': ['get', 'label'], 'text-max-width': 8 },
    paint: { ...islandTemplate?.paint },
  });
  return style;
}

/** Nút zoom tự dựng để đổi mức zoom tức thì, không chạy hoạt ảnh như điều khiển mặc định. */
class ZoomControl {
  onAdd(map) {
    const button = (className, label, delta) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = className;
      node.setAttribute('aria-label', label);
      node.title = label;
      const icon = document.createElement('span');
      icon.className = 'maplibregl-ctrl-icon';
      icon.setAttribute('aria-hidden', 'true');
      node.append(icon);
      node.addEventListener('click', () => map.jumpTo({ zoom: map.getZoom() + delta }));
      return node;
    };
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    this.container.append(button('maplibregl-ctrl-zoom-in', t('Phóng to'), 1), button('maplibregl-ctrl-zoom-out', t('Thu nhỏ bản đồ'), -1));
    return this.container;
  }
  onRemove() { this.container.remove(); }
}

/** Tạo map không hiệu ứng; ghim DOM cố định thay cho marker mặc định của MapLibre. */
export async function createPlaceMap(container, { latitude = 10.7769, longitude = 106.7009, zoom = 12, interactive = true, onMove = () => {} } = {}) {
  const [maplibre, base] = await Promise.all([import('/vendor/maplibre-gl/maplibre-gl.js'), loadBaseStyle()]);
  // File vendored đổi đuôi .mjs thành .js để máy chủ tĩnh trả đúng MIME, nên chỉ rõ worker.
  maplibre.setWorkerUrl('/vendor/maplibre-gl/maplibre-gl-worker.js');
  const map = new maplibre.Map({ container, style: sovereignStyle(base), center: [longitude, latitude], zoom,
    interactive, dragRotate: false, pitchWithRotate: false, touchPitch: false, keyboard: false, boxZoom: false,
    doubleClickZoom: false, maxPitch: 0, fadeDuration: 0, attributionControl: { compact: false } });
  map.touchZoomRotate.disableRotation();
  // Thả tay khi kéo thì dừng ngay, không trôi quán tính.
  map.dragPan.enable({ linearity: 0.3, easing: value => value, deceleration: 2500, maxSpeed: 0 });
  // Zoom góc phải trên, CSS chừa chỗ cho nút toàn màn hình ngay phía trên.
  if (interactive) map.addControl(new ZoomControl(), 'top-right');
  // Phím mũi tên di chuyển tức thì, không pan hoạt ảnh.
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
  let marker = null;
  /** Cập nhật ghim không pan hoạt ảnh, tuỳ chọn đưa tâm về kết quả tìm kiếm. */
  function setPoint(lat, lon, center = false) {
    if (!marker) {
      const element = document.createElement('div');
      element.className = 'place-map__pin';
      element.title = t('Địa điểm đã chọn');
      element.append(editorIcon('pin', 36));
      marker = new maplibre.Marker({ element, anchor: 'bottom', draggable: interactive }).setLngLat([lon, lat]).addTo(map);
      marker.on('dragend', () => { const point = marker.getLngLat(); onMove(point.lat, point.lng); });
    } else marker.setLngLat([lon, lat]);
    if (center) map.jumpTo({ center: [lon, lat], zoom: 16 });
  }
  if (!interactive) setPoint(latitude, longitude);
  if (interactive) map.on('click', event => onMove(event.lngLat.lat, event.lngLat.lng));
  return {
    map,
    setPoint,
    /** Đo lại khung sau khi đổi kích thước hoặc bỏ hidden, không di chuyển ghim. */
    resize: () => map.resize(),
    destroy: () => { container.removeEventListener('keydown', moveByKeyboard); map.remove(); },
  };
}
