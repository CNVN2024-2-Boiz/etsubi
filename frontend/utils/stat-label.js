/** Nhãn dùng cùng một nguồn cho tooltip và trình đọc màn hình, không tạo số khi API thiếu dữ liệu. */
export function statLabel(count, label) {
  const noun = String(label).replace(/^Số\s+/u, '');
  return Number.isFinite(count) ? count + ' ' + noun : 'Số ' + noun + ' · chưa có dữ liệu';
}
