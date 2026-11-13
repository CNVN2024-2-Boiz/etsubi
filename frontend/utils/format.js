/** Định dạng tên và thời gian cho avatar, header và thẻ bài viết. */

/**
 * Lấy chữ đầu hai từ cuối để làm avatar dự phòng trong header và trang nội dung.
 * @param {string} name Tên hiển thị của người dùng.
 * @returns {string} Tối đa hai ký tự viết hoa.
 */
export function initials(name) {
  const words = String(name || '').trim().split(/\s+/u).filter(Boolean);
  const lastWords = words.slice(-2);
  const letters = lastWords.map(word => Array.from(word)[0]);
  return letters.join('').toLocaleUpperCase('vi-VN');
}

/**
 * Diễn đạt thời gian tiếng Việt cho kết quả tìm kiếm và thẻ bài viết.
 * @param {string|number|Date} date Thời điểm cần hiển thị.
 * @returns {string} Thời gian tương đối, ngày đầy đủ hoặc rỗng khi đầu vào sai.
 */
export function relativeTime(date) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  // Không hiện thời gian âm nếu đồng hồ máy người dùng chậm hơn máy chủ.
  const minutes = Math.max(0, Math.floor((Date.now() - value.getTime()) / 60000));
  if (minutes < 1) {
    return 'vừa xong';
  }
  if (minutes < 60) {
    return minutes + ' phút trước';
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours + ' giờ trước';
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days + ' ngày trước';
  }
  if (days < 35) {
    return Math.floor(days / 7) + ' tuần trước';
  }
  return value.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
