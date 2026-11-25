/** Soạn email hỗ trợ thuần dữ liệu, mã hoá toàn bộ tiêu đề và nội dung trước khi mở ứng dụng thư. */
import { t } from '/utils/i18n.js';

export function buildSupportMailto(topicLabel, email, message) {
  // Dòng email liên hệ ở cuối thư theo ngôn ngữ giao diện; tiền tố [Etsubi] là tên thương hiệu nên giữ nguyên.
  return 'mailto:contact@etsubi.net?subject=' + encodeURIComponent('[Etsubi] ' + topicLabel)
    + '&body=' + encodeURIComponent(message + '\n\n' + t('Email liên hệ: {email}', { email }));
}
