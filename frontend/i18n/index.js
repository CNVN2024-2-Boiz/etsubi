/** Gộp từ điển của từng nhóm trang thành một bảng tra dùng chung cho utils/i18n.js. */
import common from '/i18n/common.js';
import forum from '/i18n/forum.js';
import settings from '/i18n/settings.js';
import auth from '/i18n/auth.js';
import discover from '/i18n/discover.js';
import info from '/i18n/info.js';
import legal from '/i18n/legal.js';

// Mỗi nhóm giữ một file riêng để nhiều người có thể dịch cùng lúc mà không đụng nhau.
export const groups = { common, forum, settings, auth, discover, info, legal };
export const dictionary = Object.assign({}, common, forum, settings, auth, discover, info, legal);
