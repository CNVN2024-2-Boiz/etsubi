/** Soạn email hỗ trợ thuần dữ liệu, mã hoá toàn bộ tiêu đề và nội dung trước khi mở ứng dụng thư. */
export function buildSupportMailto(topicLabel, email, message) {
  return 'mailto:contact@etsubi.vn?subject=' + encodeURIComponent('[Etsubi] ' + topicLabel)
    + '&body=' + encodeURIComponent(message + '\n\nEmail liên hệ: ' + email);
}
