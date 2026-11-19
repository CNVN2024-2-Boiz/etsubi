/**
 * Danh sách nơi ở cho hồ sơ: 34 tỉnh/thành Việt Nam sau ngày 01/07/2025 và 47 tỉnh Nhật Bản.
 * Nguồn Việt Nam: https://baochinhphu.vn/nghi-quyet-cua-quoc-hoi-ve-sap-xep-don-vi-hanh-chinh-cap-tinh-102250612191145158.htm
 * Tên được lưu nguyên văn vào address để các trang có thể dùng lại mà không cần dịch mã địa phương.
 * Dữ liệu bên dưới luôn là tiếng Việt; chỉ khi hiển thị mới dịch bằng t(tên), bản dịch nằm trong i18n/auth.js.
 */
export const vietnamPlaces = Object.freeze([
  'TP. Hồ Chí Minh', 'TP. Hà Nội', 'TP. Hải Phòng', 'TP. Huế', 'TP. Đà Nẵng', 'TP. Cần Thơ', // i18n-ignore
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', // i18n-ignore
  'Đồng Tháp', 'Gia Lai', 'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng', // i18n-ignore
  'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', // i18n-ignore
  'Quảng Trị', 'Sơn La', 'Tây Ninh', 'Thái Nguyên', 'Thanh Hóa', 'Tuyên Quang', 'Vĩnh Long', // i18n-ignore
]);

/** Các tên romaji quen thuộc giúp sinh viên chọn tỉnh Nhật Bản bằng bàn phím của select gốc. */
export const japanPlaces = Object.freeze([
  'Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima',
  'Ibaraki', 'Tochigi', 'Gunma', 'Saitama', 'Chiba', 'Tokyo', 'Kanagawa',
  'Niigata', 'Toyama', 'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano', 'Gifu',
  'Shizuoka', 'Aichi', 'Mie', 'Shiga', 'Kyoto', 'Osaka', 'Hyogo', 'Nara',
  'Wakayama', 'Tottori', 'Shimane', 'Okayama', 'Hiroshima', 'Yamaguchi',
  'Tokushima', 'Kagawa', 'Ehime', 'Kochi', 'Fukuoka', 'Saga', 'Nagasaki',
  'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa',
]);
