/** Chủ quyền biển đảo Việt Nam trên bản đồ: vùng Hoàng Sa, Trường Sa, nhãn hiển thị và tên địa chỉ thay thế. */

// Đa giác bao quanh từng quần đảo, đủ rộng để gồm mọi đảo, bãi và nhãn nước ngoài trong vùng,
// nhưng không chạm bờ Hải Nam, Palawan hay Borneo. Toạ độ theo thứ tự [kinh độ, vĩ độ].
// label là khoá từ điển, place-map dịch bằng t(); name và address là địa danh chính thức lưu cùng bài
// giống kết quả tra cứu tiếng Việt, nên không dịch.
export const ARCHIPELAGOS = [
  {
    label: 'Quần đảo Hoàng Sa (Việt Nam)', // i18n-ignore
    name: 'Quần đảo Hoàng Sa', // i18n-ignore
    address: 'Đặc khu Hoàng Sa, thành phố Đà Nẵng, Việt Nam', // i18n-ignore
    anchor: [112.0, 16.45],
    ring: [[110.9, 15.4], [113.2, 15.4], [113.2, 17.3], [110.9, 17.3], [110.9, 15.4]],
  },
  {
    label: 'Quần đảo Trường Sa (Việt Nam)', // i18n-ignore
    name: 'Quần đảo Trường Sa', // i18n-ignore
    address: 'Đặc khu Trường Sa, tỉnh Khánh Hòa, Việt Nam', // i18n-ignore
    anchor: [114.1, 9.9],
    ring: [[111.3, 12.2], [115.2, 12.2], [116.8, 10.8], [116.8, 9.0], [115.6, 7.6], [114.2, 6.6],
      [113.6, 6.1], [112.8, 6.1], [111.3, 7.8], [111.3, 12.2]],
  },
];

// Tên Việt Nam của các đảo, đá chính: tên; vĩ độ; kinh độ. Ghim gần một mục (trong ISLAND_RADIUS_KM)
// thì địa điểm mang tên đó; toạ độ lấy theo vị trí công bố công khai, sai số dưới 1-2 km.
// i18n-ignore: địa danh chính thức, giữ nguyên tiếng Việt ở mọi ngôn ngữ giao diện.
const ISLAND_TABLE = `
Đảo Phú Lâm; 16.8344; 112.3389
Đảo Cây; 16.9833; 112.2667
Đảo Linh Côn; 16.6667; 112.7333
Đảo Hoàng Sa; 16.5333; 111.6000
Đảo Hữu Nhật; 16.5000; 111.5833
Đảo Quang Ảnh; 16.4500; 111.5083
Đảo Duy Mộng; 16.4667; 111.7333
Đảo Quang Hòa; 16.4500; 111.7083
Đảo Bạch Quy; 16.0500; 111.7667
Đảo Tri Tôn; 15.7833; 111.2000
Đá Bắc; 17.0833; 111.5000
Đảo Song Tử Tây; 11.4297; 114.3311
Đảo Song Tử Đông; 11.4547; 114.3567
Đảo Thị Tứ; 11.0546; 114.2840
Đảo Dừa; 11.0833; 115.0167
Đảo Loại Ta; 10.6823; 114.4232
Đảo Bình Nguyên; 10.8167; 115.8333
Đảo Vĩnh Viễn; 10.7333; 115.8000
Đá Su Bi; 10.9228; 114.0842
Đảo Ba Bình; 10.3769; 114.3653
Đảo Sơn Ca; 10.3783; 114.4786
Đá Ga Ven; 10.2083; 114.2236
Đảo Nam Yết; 10.1808; 114.3611
Đảo Sinh Tồn; 9.8833; 114.3297
Đảo Sinh Tồn Đông; 9.9000; 114.5583
Đá Gạc Ma; 9.7167; 114.2833
Đá Vành Khăn; 9.9000; 115.5333
Đá Lớn; 10.0333; 113.8500
Đá Chữ Thập; 9.5500; 112.8900
Đảo Phan Vinh; 8.9583; 113.6917
Đá Châu Viên; 8.8667; 112.8333
Đảo Trường Sa Đông; 8.9333; 112.3500
Đá Tây; 8.8500; 112.2000
Đảo Trường Sa; 8.6447; 111.9203
Đảo An Bang; 7.8667; 112.9167
`;

// Bán kính nhận một ghim là thuộc đảo: đủ phủ đảo và bãi quanh đảo, không lấn sang đảo kế bên quá nhiều.
const ISLAND_RADIUS_KM = 4;

/** Danh sách đảo đã tách từ bảng: { name, latitude, longitude }. */
export const ISLANDS = ISLAND_TABLE.trim().split('\n').map(line => {
  const [name, latitude, longitude] = line.split(';').map(part => part.trim());
  return { name, latitude: Number(latitude), longitude: Number(longitude) };
});

// Vùng biển khơi Biển Đông, cách xa bờ các nước. Nhãn nào ở đây không có tên tiếng Việt (bãi, gò,
// núi ngầm do nước ngoài đặt tên) thì bị ẩn; đảo ven bờ như Phú Quý, Lý Sơn nằm ngoài vùng này.
export const EAST_SEA_WATERS = [[110.0, 12.5], [110.3, 15.0], [110.6, 17.0], [111.5, 17.8], [114.5, 18.5], [117.5, 17.0],
  [118.5, 15.5], [118.0, 12.0], [117.0, 10.5], [116.5, 9.0], [115.5, 7.2], [113.5, 5.6], [111.0, 5.5], [109.5, 7.5],
  [109.5, 10.5], [110.0, 12.5]];

// Nhãn Biển Đông đặt giữa hai quần đảo, thay cho tên biển mà bản đồ gốc hiển thị.
export const EAST_SEA = { label: 'Biển Đông', anchor: [114.6, 13.8] }; // i18n-ignore

// Tên đơn vị hành chính mà phía Trung Quốc tự đặt trên vùng biển Việt Nam; luôn ẩn dù nằm ở đâu.
export const FOREIGN_ADMIN_NAMES = ['三沙市', '西沙区', '南沙区', '中沙区', '西沙群岛', '南沙群岛', '中沙群岛'];

/** Kiểm tra điểm trong đa giác bằng thuật toán tia, đủ chính xác cho các vùng biển rộng ở trên. */
function insideRing(longitude, latitude, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > latitude) !== (yj > latitude) && longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Trả quần đảo chứa toạ độ, hoặc null khi điểm nằm ngoài cả hai vùng. */
export function archipelagoAt(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return ARCHIPELAGOS.find(area => insideRing(lon, lat, area.ring)) || null;
}

/** Khoảng cách mặt cầu (km) giữa hai toạ độ, công thức haversine. */
function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Đảo gần ghim nhất trong bán kính cho phép, hoặc null khi ghim ở xa mọi đảo trong bảng. */
function nearestIsland(latitude, longitude) {
  let best = null;
  let bestDistance = ISLAND_RADIUS_KM;
  for (const island of ISLANDS) {
    const distance = distanceKm(latitude, longitude, island.latitude, island.longitude);
    if (distance <= bestDistance) { best = island; bestDistance = distance; }
  }
  return best;
}

/**
 * Địa điểm trong Hoàng Sa, Trường Sa luôn mang tên Việt Nam: tên đảo trong bảng nếu ghim ở gần, không thì
 * tên quần đảo; địa chỉ luôn là đặc khu của Việt Nam. Tên đối tượng trên dữ liệu OpenStreetMap ở đây phần lớn
 * do nước ngoài đặt (kể cả bản phiên âm tiếng Việt), nên không giữ lại.
 */
export function sovereignPlace(place) {
  if (!place) return place;
  const area = archipelagoAt(place.latitude, place.longitude);
  if (!area) return place;
  const island = nearestIsland(Number(place.latitude), Number(place.longitude));
  return { ...place, name: island ? island.name : area.name, address: area.address };
}
