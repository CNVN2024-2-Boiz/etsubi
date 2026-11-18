/** Hộp thoại địa điểm dùng chung; mỗi lần mở có controller riêng để bỏ phản hồi đã cũ. */
import { el } from '/utils/dom.js';
import { editorIcon } from '/components/rich-editor/rich-editor.js';
import { createPlaceMap } from '/components/place-picker/place-map.js';
import { searchPlaces, reversePlace } from '/services/geo/nominatim.js';
import { t } from '/utils/i18n.js';

let previousPoint = null;

/** Mở native dialog chồng trên dialog soạn bài, trả null khi Huỷ hoặc Escape. */
export function pickPlace(existing = null) {
  return new Promise(resolve => {
    const controller = new AbortController();
    let searchController = null;
    let reverseController = null;
    let point = existing ? { ...existing } : null;
    let results = [];
    let selectedIndex = -1;
    let lastQuery = '';
    let version = 0;
    let moveVersion = 0;
    let debounce = null;
    let mapView = null;
    let finished = false;
    let fullscreen = false;
    const titleId = 'place-picker-title';
    const dialog = el('dialog', { className: 'place-picker', 'aria-labelledby': titleId, 'data-place-picker': '' });
    const close = el('button', { type: 'button', className: 'place-picker__close', 'aria-label': t('Đóng địa điểm') }, editorIcon('close', 24));
    const input = el('input', { id: 'place-query', type: 'search', className: 'place-picker__input', placeholder: t('Tìm địa điểm…'),
      autocomplete: 'off', role: 'combobox', 'aria-controls': 'place-results', 'aria-expanded': 'false', 'aria-autocomplete': 'list' });
    const list = el('div', { id: 'place-results', className: 'place-picker__results', role: 'listbox', 'aria-label': t('Kết quả địa điểm'), hidden: true });
    const status = el('p', { className: 'place-picker__status', role: 'status' });
    const map = el('div', { className: 'place-map place-picker__map', 'aria-label': t('Bản đồ chọn địa điểm') });
    const expand = el('button', { type: 'button', className: 'place-picker__fullscreen', 'aria-pressed': 'false' }, editorIcon('maximize', 16), t('Toàn màn hình'));
    const coordinates = el('strong', { 'data-place-coordinates': '' }, '–');
    const locate = el('button', { type: 'button', className: 'place-picker__locate' }, editorIcon('locate', 16), t('Dùng vị trí của tôi'));
    const error = el('p', { className: 'place-picker__error', role: 'alert' });
    const cancel = el('button', { type: 'button', className: 'btn btn--secondary' }, t('Huỷ'));
    const apply = el('button', { type: 'button', className: 'btn btn--primary', disabled: !point }, t('Gắn địa điểm'));
    dialog.append(el('div', { className: 'place-picker__heading' }, el('h2', { id: titleId, className: 't-display' }, t('Gắn địa điểm')), close),
      el('label', { className: 'u-visually-hidden', for: 'place-query' }, t('Tìm địa điểm')),
      el('div', { className: 'place-picker__search' }, editorIcon('search'), input), list, status,
      el('div', { className: 'place-picker__map-wrap' }, map, el('span', { className: 'place-picker__map-hint' }, t('Kéo ghim hoặc bấm vào bản đồ để chỉnh vị trí')), expand),
      el('div', { className: 'place-picker__location' },
        el('div', { className: 'place-picker__coordinates' }, el('span', {}, t('Toạ độ'), ' ', coordinates), locate), error),
      el('div', { className: 'place-picker__actions' }, cancel, apply));

    /** Kết thúc một lần, dọn mạng/map và resolve trực tiếp thay vì phụ thuộc sự kiện close. */
    function finish(value) {
      if (finished) return;
      finished = true;
      clearTimeout(debounce);
      controller.abort(); searchController?.abort(); reverseController?.abort();
      mapView?.destroy();
      window.removeEventListener('resize', resizeMap);
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(value);
    }
    /** Sau thay đổi kích thước, Leaflet đo lại khung mà không di chuyển ghim hoặc chạy hiệu ứng. */
    function resizeMap() {
      if (!finished) mapView?.map.invalidateSize({ animate: false });
    }
    /** Toàn màn hình giữ nguyên input và toạ độ, chỉ thay bố cục bằng lớp CSS. */
    function toggleFullscreen() {
      fullscreen = !fullscreen;
      dialog.classList.toggle('is-fullscreen', fullscreen);
      expand.setAttribute('aria-pressed', String(fullscreen));
      expand.replaceChildren(editorIcon(fullscreen ? 'minimize' : 'maximize', 16), fullscreen ? t('Thu nhỏ') : t('Toàn màn hình'));
      resizeMap();
    }
    /** Toạ độ luôn cập nhật ngay, kể cả khi reverse đang chờ hoặc bị lỗi. */
    function syncPoint(center = false) {
      coordinates.textContent = point ? point.latitude.toFixed(4) + ', ' + point.longitude.toFixed(4) : '–';
      apply.disabled = !point;
      if (point) mapView?.setPoint(point.latitude, point.longitude, center);
    }
    /** Chọn kết quả lưu đúng tên/địa chỉ và hủy reverse của ghim trước đó. */
    function selectResult(index) {
      if (!results[index]) return;
      moveVersion++;
      reverseController?.abort();
      point = { ...results[index] };
      selectedIndex = index;
      syncPoint(true);
      renderResults();
    }
    /** Danh sách dùng option và aria-selected, chỉ dữ liệu chữ được đưa vào DOM. */
    function renderResults() {
      list.hidden = !results.length;
      input.setAttribute('aria-expanded', String(Boolean(results.length)));
      list.replaceChildren(...results.map((result, index) => {
        const selected = index === selectedIndex;
        const row = el('div', { id: 'place-result-' + index, role: 'option', tabindex: '-1',
          'aria-selected': String(selected), className: 'place-picker__result' }, editorIcon('pin'),
          el('span', { className: 'place-picker__result-text' }, el('strong', {}, result.name), el('span', {}, result.address)), selected ? editorIcon('check') : null);
        row.addEventListener('click', () => selectResult(index));
        return row;
      }));
      if (selectedIndex >= 0) input.setAttribute('aria-activedescendant', 'place-result-' + selectedIndex);
      else input.removeAttribute('aria-activedescendant');
    }
    /** Tìm query đã thay đổi sau Enter hoặc 800ms ngừng gõ; hàng đợi service giữ tối đa một lần/giây. */
    async function search() {
      clearTimeout(debounce);
      const query = input.value.trim();
      if (query.length < 3 || query === lastQuery) return;
      lastQuery = query;
      const current = ++version;
      searchController?.abort();
      searchController = new AbortController();
      status.textContent = t('Đang tìm…');
      try {
        const found = await searchPlaces(query, { signal: searchController.signal });
        if (finished || current !== version || query !== input.value.trim()) return;
        results = found;
        selectedIndex = -1;
        renderResults();
        status.textContent = results.length ? '' : t('Không tìm thấy địa điểm phù hợp.');
      } catch (failure) {
        if (finished || current !== version || searchController.signal.aborted) return;
        lastQuery = '';
        results = [];
        renderResults();
        status.textContent = failure.message || t('Không kết nối được dịch vụ địa điểm.');
      }
    }
    /** Kéo ghim hoặc định vị giữ tên đã chọn; chỉ tra ngược khi chưa có tên thật. */
    async function movePoint(latitude, longitude, center = false) {
      if (finished) return;
      const current = ++moveVersion;
      reverseController?.abort();
      point = { name: point?.name || '', address: point?.address || '', latitude: Number(Math.max(-90, Math.min(90, latitude)).toFixed(6)),
        longitude: Number((((longitude + 180) % 360 + 360) % 360 - 180).toFixed(6)) };
      selectedIndex = -1;
      renderResults(); syncPoint(center);
      if (point.name && point.name !== t('Vị trí đã chọn')) return;
      reverseController = new AbortController();
      try {
        const reverse = await reversePlace(point.latitude, point.longitude, { signal: reverseController.signal });
        if (!finished && current === moveVersion) point = { ...point, name: reverse?.name || t('Vị trí đã chọn'), address: reverse?.address || '' };
      } catch {
        if (!finished && current === moveVersion) point.name = t('Vị trí đã chọn');
      }
    }
    // Thay query vô hiệu hoá ngay phản hồi cũ, không để kết quả query trước chen vào lúc debounce.
    input.addEventListener('input', () => {
      clearTimeout(debounce); version++; searchController?.abort();
      results = []; selectedIndex = -1; renderResults(); status.textContent = '';
      if (input.value.trim().length >= 3) debounce = setTimeout(search, 800);
      if (input.value.trim() !== lastQuery) lastQuery = '';
    });
    // Mũi tên giữ focus ở combobox và chọn option; Enter không gửi form bên dưới.
    input.addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowUp'].includes(event.key) && results.length) {
        event.preventDefault();
        const next = selectedIndex < 0 ? (event.key === 'ArrowDown' ? 0 : results.length - 1)
          : (selectedIndex + (event.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length;
        selectResult(next);
      } else if (event.key === 'Enter') { event.preventDefault(); if (selectedIndex >= 0) selectResult(selectedIndex); else void search(); }
    });
    // Geolocation chỉ chạy từ nút người dùng, không tự xin quyền khi mở dialog.
    locate.addEventListener('click', () => {
      error.textContent = '';
      if (!navigator.geolocation) { error.textContent = t('Trình duyệt không hỗ trợ lấy vị trí.'); return; }
      locate.disabled = true;
      navigator.geolocation.getCurrentPosition(position => {
        if (finished) return;
        locate.disabled = false;
        void movePoint(position.coords.latitude, position.coords.longitude, true);
      }, failure => {
        if (finished) return;
        locate.disabled = false;
        error.textContent = t('Không lấy được vị trí: {reason}', { reason: failure.code === 1 ? t('bạn đã từ chối quyền truy cập.') : failure.code === 3 ? t('hết thời gian chờ.') : t('vị trí hiện không khả dụng.') });
      }, { timeout: 10000 });
    });
    cancel.addEventListener('click', () => finish(null));
    close.addEventListener('click', () => finish(null));
    apply.addEventListener('click', () => { if (point) { previousPoint = { ...point }; finish({ ...point, name: point.name || t('Vị trí đã chọn') }); } });
    expand.addEventListener('click', toggleFullscreen);
    window.addEventListener('resize', resizeMap);
    dialog.addEventListener('cancel', event => { event.preventDefault(); event.stopPropagation(); if (fullscreen) toggleFullscreen(); else finish(null); });
    dialog.addEventListener('close', () => finish(null));
    document.body.append(dialog);
    dialog.showModal();
    if (existing) input.value = existing.name;
    // Focus vào ô tìm thay vì nút đóng, để gõ rồi Enter không vô tình đóng hộp thoại.
    input.focus();
    syncPoint();
    // Import map có thể kết thúc sau khi Huỷ: huỷ map vừa tạo thay vì giữ DOM đã tháo.
    void createPlaceMap(map, { ...(point || previousPoint || {}), zoom: point || previousPoint ? 16 : 12,
      onMove: (lat, lon) => void movePoint(lat, lon) }).then(view => {
      if (finished) { view.destroy(); return; }
      mapView = view;
      mapView.map.invalidateSize({ animate: false });
      syncPoint(Boolean(point));
    }).catch(() => { if (!finished) error.textContent = t('Không tải được bản đồ. Bạn vẫn có thể tìm địa điểm hoặc dùng vị trí của mình.'); });
  });
}
