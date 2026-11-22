# Bàn giao: trang Điều khoản sử dụng và Chính sách quyền riêng tư

> Ngày viết: 2026-11-22 · Người giao: ShiroTrang (Vũ Thiện Nhân) · Người nhận: Quân (`DesmondQuan6868`), Phú (`mahphu`) và agent của mỗi bạn.
> Tài liệu này dành cho cả người và agent. Agent đọc hết rồi mới code.

## 0. Đọc trước khi làm

1. **[`AGENTS.md`](../AGENTS.md) là luật bắt buộc**, giống đợt bàn giao cho bạn Tài. Tóm tắt những điều hay bị quên:
   - Chỉ HTML/CSS/JS thuần (ES modules), không framework, không build step, không thư viện mới.
   - Màu, cỡ chữ, khoảng cách lấy từ token trong `frontend/styles/tokens.css`; không style inline; không `@keyframes` hay animation bằng JS.
   - Mỗi khối code (hàm, khối CSS, khối HTML) có một dòng chú thích tiếng Việt.
   - **Không bao giờ dùng dấu em dash (U+2014)**; dùng en dash (–) hoặc gạch nối (-).
   - Header và footer dùng component chung (`components/header`, `components/footer`), không tự vẽ lại.
   - Không sửa `backend/`. Việc cần backend ghi vào mục 7 của tài liệu này và báo người giao.
2. **i18n:** mọi chữ trên giao diện đi qua `t()` hoặc `data-i18n`, có đủ bản JA và EN trong `frontend/i18n/*.js`. Quy tắc ở [`frontend/dev/i18n-guide.md`](../frontend/dev/i18n-guide.md).
3. **URL sạch (đợt 14):** trang mới là thư mục có `index.html` (ví dụ `frontend/terms/index.html` → `/terms/`). Không tạo file trong `frontend/pages/*.html` nữa. Xem mục "Page skeleton" trong `AGENTS.md`.
4. **Quy trình review cuối** ở `AGENTS.md` §7 "Final review procedure" là bắt buộc trước khi báo xong.

## 1. Phân công

| Việc | Người làm | File chính |
|---|---|---|
| **Khung chung** của hai trang: bố cục 2 cột, mục lục, hero, ghi chú ngôn ngữ, thẻ Tóm tắt, thẻ Liên hệ, bản mobile | **Quân** (làm và đẩy lên trước) | `frontend/styles/pages/legal.css`, `frontend/pages/legal.js` |
| Trang **Điều khoản sử dụng** `/terms/` | **Quân** | `frontend/terms/index.html`, `frontend/i18n/legal.js` (phần Điều khoản) |
| Thêm `routes.terms`, `routes.privacy`; sửa link trong footer | **Quân** | `frontend/utils/routes.js`, `frontend/components/footer/footer.js` |
| Trang **Chính sách quyền riêng tư** `/privacy/` gồm 2 bảng (dữ liệu thu thập, bên thứ ba) và bản thẻ trên mobile | **Phú** | `frontend/privacy/index.html`, CSS bảng trong `legal.css` (khối riêng có chú thích "Bảng dữ liệu"), `frontend/i18n/legal.js` (phần Quyền riêng tư) |
| **Hai ô đồng ý** ở trang Đăng ký và link trong Hoàn thiện hồ sơ | **Phú** | `frontend/register/index.html`, `frontend/utils/auth-page.js`, `frontend/register-advanced/index.html`, `frontend/pages/profile/register-advanced.js`, `frontend/i18n/auth.js` |

**Thứ tự để không đụng nhau:**
1. Quân tạo `legal.css`, `legal.js`, `i18n/legal.js` (rỗng sẵn hai phần `// Điều khoản` và `// Quyền riêng tư`), đăng ký `legal` trong `frontend/i18n/index.js`, rồi push commit khung chung trước.
2. Phú tạo nhánh từ commit đó (hoặc rebase lên), chỉ thêm khối CSS bảng ở cuối `legal.css`, chỉ sửa phần `// Quyền riêng tư` trong `i18n/legal.js`.
3. Hai bạn không sửa file của nhau ngoài các chỗ trên. Cần đổi khung chung thì nhắn Quân.

**Git (làm qua repo của Lead FE `ShiroTrang/IE104`):**
1. Chấp nhận lời mời collaborator của `ShiroTrang/IE104`, rồi clone repo đó (hoặc thêm làm remote nếu đã có bản clone repo nhóm).
2. Trước commit đầu tiên, đặt `git config user.email` bằng **email đã gắn với tài khoản GitHub của mình** (hoặc email `…@users.noreply.github.com` trong Settings › Emails). Sai email thì GitHub không tính bạn là contributor.
3. Nhánh nền là `feat/fe-legal-pages` (có sẵn tài liệu này, tách từ `frontend` của repo nhóm).
   - Quân: tạo `feat/fe-terms` từ nhánh nền.
   - Phú: tạo `feat/fe-privacy` từ commit khung chung của Quân, xem thứ tự ở trên.
4. Commit tiếng Anh, thể mệnh lệnh (`feat(fe): add terms page`). Push nhánh của mình lên `ShiroTrang/IE104`.
5. **Không push lên repo nhóm `CNVN2024-2-Boiz/etsubi`, không tự mở PR vào repo nhóm.** Xong thì báo ShiroTrang review. ShiroTrang mở PR từ `ShiroTrang/IE104` vào `frontend` của repo nhóm và merge bằng **"Create a merge commit"** (không squash, để giữ tên tác giả từng commit).

## 2. Thiết kế Figma

Thiết kế nằm trong file Figma general `HFYjrrtGqo86EpOX1Bdg88` (Page 1), đã font swap:

| Frame | Node | Dùng cho |
|---|---|---|
| `Etsubi Điều khoản sử dụng` | `274:5589` | Desktop 1920, trang `/terms/` |
| `Etsubi Chính sách quyền riêng tư` | `274:5889` | Desktop 1920, trang `/privacy/`, có 2 bảng |
| `Etsubi Điều khoản sử dụng · Mobile` | `274:6315` | Mobile 375 |
| `Etsubi Chính sách quyền riêng tư · Mobile` | `274:6373` | Mobile 375, bảng thành thẻ xếp dọc |
| `Etsubi Register 1a` | `274:3560` | Hai ô đồng ý mới ở form Đăng ký |
| `Đợt 15 · Ghi chú Điều khoản & Quyền riêng tư` | `274:6445` | Ghi chú hành vi |

Link mở nhanh: `https://www.figma.com/design/HFYjrrtGqo86EpOX1Bdg88/?node-id=274-5589` (đổi `node-id` theo bảng, thay `:` bằng `-`). Agent có Figma MCP thì đọc bằng `get_design_context` với các node trên.

Chữ trong ngoặc vuông `[ ]` trên Figma là **placeholder**. Nội dung thật viết theo mục 5 và 6.

## 3. URL và file

- `/terms/` → `frontend/terms/index.html`, `/privacy/` → `frontend/privacy/index.html`. Sao chép khung trang từ `AGENTS.md` ("Page skeleton").
- `routes.terms = '/terms/'`, `routes.privacy = '/privacy/'` trong `utils/routes.js`. Không tạo stub `/pages/…` (đây là trang mới, chưa có link cũ).
- Mỗi mục có `id` cố định để dẫn link được, ví dụ `/privacy/#quyen-cua-ban`, `/terms/#noi-dung-bi-cam`. Danh sách `id` đề xuất ở mục 5 và 6 (cột "id").
- Footer (`components/footer/footer.js`), cột "Tài nguyên":
  - "Điều khoản sử dụng" → `routes.terms` (hiện đang trỏ `routes.support + '#terms'`).
  - Thêm "Chính sách quyền riêng tư" → `routes.privacy`. Figma ghi "Chính sách quyền riêng tư", không dùng chữ "Chính sách bảo mật" nữa.

## 4. Bố cục và hành vi

**Desktop (≥ 960px), theo frame desktop:**
- Header: `mountHeader(..., { active: null, searchForm: true })`, không tab nào được chọn. Footer `full`.
- Hero hồng như trang Hỗ trợ nhưng thấp hơn (khoảng 360px), gồm:
  - eyebrow "VĂN BẢN PHÁP LÝ";
  - tiêu đề `<h1>`;
  - dòng "Có hiệu lực từ … · Phiên bản … · Cập nhật lần cuối …";
  - công tắc 2 nút (Điều khoản / Quyền riêng tư). Đây là 2 link `<a>`, link của trang đang xem có `aria-current="page"`.
- Thân trang chia 2 cột, rộng 1440, khoảng cách 40:
  - **Mục lục** rộng 340, `position: sticky` (top bằng chiều cao header + khoảng đệm). Bọc trong `<nav aria-label="Mục lục">`, danh sách `<ol>` gồm các link `#id`. Mục đang đọc có nền hồng và `aria-current="true"`.
  - **Nội dung** chiếm phần còn lại, gồm theo thứ tự: ghi chú ngôn ngữ, thẻ "Tóm tắt nhanh", thẻ nội dung (các `<section>` có `<h2>` đánh số), thẻ Liên hệ có nút sang văn bản còn lại.
- Đánh dấu mục đang đọc: dùng `IntersectionObserver`, chỉ đổi class, **không cuộn mượt bằng JS**. `scroll-behavior` để mặc định.

**Mobile (≤ 600px), theo frame mobile:**
- Mục lục thu thành nút "Mục lục · 15 mục" (`<button aria-expanded aria-controls>`). Bấm thì mở danh sách ngay bên dưới, không animation; chọn một mục thì đóng lại.
- Công tắc 2 văn bản thành thanh pill rộng hết màn.
- Trang Quyền riêng tư: mỗi dòng bảng thành một thẻ gồm tên nhóm, chip Bắt buộc/Tuỳ chọn, nội dung và dòng "Dùng để: …". Dùng **cùng một HTML `<table>`**, đổi bố cục bằng CSS (`display: block` cho từng hàng, nhãn cột lấy từ `data-label`), không dựng hai bản HTML.
- Không được có cuộn ngang ở 375px.

**Khác:**
- Thêm `@media print` đơn giản (ẩn header, footer, mục lục) để người dùng in hoặc lưu PDF được, vì luật yêu cầu nội dung "có thể in, sao chép".
- Đầu nội dung có ghi chú: "Bản tiếng Việt là văn bản có giá trị pháp lý. Bản 日本語 và English chỉ để tham khảo; nếu có khác biệt, bản tiếng Việt được ưu tiên."
- Trang chỉ có văn bản tĩnh, không gọi API.

## 5. Nội dung trang Điều khoản sử dụng (Quân)

Căn cứ chính: **Nghị định 147/2024/NĐ-CP** (quản lý, cung cấp, sử dụng dịch vụ Internet và thông tin trên mạng, hiệu lực 25/12/2024). Theo điểm d khoản 2 Điều 29, thỏa thuận sử dụng mạng xã hội phải có tối thiểu:
1. nội dung cấm trao đổi, chia sẻ;
2. trách nhiệm của người dùng, ghi rõ không được lợi dụng mạng xã hội để hoạt động báo chí khi không có phép;
3. trách nhiệm của bên cung cấp;
4. cơ chế xử lý người dùng vi phạm;
5. cảnh báo rủi ro khi lưu trữ, trao đổi, chia sẻ thông tin trên mạng;
6. cơ chế giải quyết khiếu nại, tranh chấp;
7. cơ chế xử lý khiếu nại về thông tin xâm phạm quyền và lợi ích của người khác;
8. công khai việc có hay không thu thập, xử lý thông tin người dùng;
9. biện pháp bảo đảm người dùng quyết định cho phép thu thập hoặc chia sẻ thông tin của mình;
10. chính sách bảo vệ thông tin người dùng.

Mỗi mục dưới đây là một `<section>`. Cột "Phải nói" là ý tối thiểu; viết ngắn, dễ hiểu, xưng "Etsubi" và "bạn".

| # | id | Tiêu đề | Phải nói | Căn cứ |
|---|---|---|---|---|
| 1 | `gioi-thieu` | Giới thiệu và phạm vi áp dụng | Etsubi là gì; bên cung cấp là nhóm [tên nhóm], đồ án môn IE104 tại [trường]; điều khoản áp dụng cho mọi người dùng | – |
| 2 | `chap-nhan` | Chấp nhận điều khoản và độ tuổi | Đồng ý bằng ô tích khi đăng ký (không tích sẵn). Phải từ đủ 16 tuổi; người dưới 16 tuổi do cha, mẹ hoặc người giám hộ đăng ký bằng thông tin của họ và giám sát | NĐ 147 Điều 27 khoản 3 điểm a |
| 3 | `tai-khoan` | Tài khoản và bảo mật | Thông tin đúng sự thật; @handle là duy nhất; tự giữ mật khẩu; báo ngay khi nghi bị lộ | NĐ 147 Điều 36 |
| 4 | `noi-dung-bi-cam` | Nội dung bị cấm | Liệt kê các nhóm nội dung cấm theo Luật An ninh mạng (Điều 8 Luật 24/2018/QH14; từ 01/7/2026 là Điều 7 Luật An ninh mạng 2025 số 116/2025/QH15), thêm quy tắc riêng của Etsubi (spam, quảng cáo, giả mạo người khác). Dẫn link tới Quy tắc cộng đồng ở trang Hỗ trợ | NĐ 147 Điều 29 khoản 2 điểm d; Luật ANM |
| 5 | `trach-nhiem-nguoi-dung` | Quyền và trách nhiệm của người dùng | Được dùng dịch vụ, được bảo vệ thông tin; chịu trách nhiệm về nội dung mình đăng; không đặt tên tài khoản gây nhầm là cơ quan báo chí; không làm phóng sự, phỏng vấn kiểu báo chí | NĐ 147 Điều 36 |
| 6 | `trach-nhiem-etsubi` | Quyền và trách nhiệm của Etsubi | Vận hành đúng điều khoản; gỡ nội dung vi phạm chậm nhất 24 giờ kể từ khi phát hiện; cung cấp thông tin người dùng cho cơ quan có thẩm quyền khi có yêu cầu bằng văn bản | NĐ 147 Điều 35 khoản 5, 9 |
| 7 | `phan-phoi-noi-dung` | Cách Etsubi sắp xếp và hiển thị nội dung | Giải thích các tab Mới nhất, Phổ biến, Đang theo dõi, Hỏi đáp, bài nổi bật; không có thuật toán quảng cáo | NĐ 147 Điều 35 khoản 2 (phải công bố cách phân phối nội dung) |
| 8 | `xu-ly-vi-pham` | Xử lý vi phạm | Các mức xử lý: ẩn, xoá bài hoặc bình luận; khoá bình luận; tắt tiếng có thời hạn; cấm tài khoản. Ai được làm (Điều hành viên, Quản trị viên, theo RBAC ở `AGENTS.md` §8) | NĐ 147 Điều 29 khoản 2 điểm d; Điều 35 khoản 7 |
| 9 | `canh-bao-rui-ro` | Cảnh báo rủi ro khi chia sẻ thông tin | Nội dung công khai ai cũng đọc được; cân nhắc trước khi đăng địa chỉ, vị trí, ảnh, thông tin của người khác; ảnh và link từ trang ngoài không do Etsubi kiểm soát | NĐ 147 Điều 29 khoản 2 điểm d |
| 10 | `so-huu-noi-dung` | Quyền sở hữu nội dung | Người dùng giữ quyền với nội dung của mình và cho phép Etsubi hiển thị, dịch, lưu trữ để vận hành; không đăng nội dung vi phạm quyền tác giả | Luật Sở hữu trí tuệ |
| 11 | `dich-tu-dong` | Dịch tự động bằng AI | Bản dịch do AI tạo ra chỉ để tham khảo, có thể sai; nội dung gốc mới là bản có giá trị. Dữ liệu gửi đi khi dịch: xem `/privacy/#ben-thu-ba` | – |
| 12 | `khieu-nai` | Khiếu nại và giải quyết tranh chấp | Cách gửi khiếu nại (email, trang Hỗ trợ). Nội dung vi phạm Luật An ninh mạng được gỡ trong 48 giờ kể từ khi nhận khiếu nại. Ưu tiên thương lượng, nếu không được thì giải quyết theo pháp luật Việt Nam | NĐ 147 Điều 35 khoản 8; Điều 29 khoản 2 điểm d |
| 13 | `du-lieu-ca-nhan` | Thu thập và xử lý dữ liệu cá nhân | Nói rõ **Etsubi có thu thập và xử lý dữ liệu cá nhân**, kèm link sang Chính sách quyền riêng tư. Người dùng quyết định việc chia sẻ thông tin (vị trí tuỳ chọn, hồ sơ tuỳ chọn) | NĐ 147 Điều 29 khoản 2 điểm d; Điều 35 khoản 3 |
| 14 | `thay-doi` | Thay đổi điều khoản và chấm dứt | Báo trước khi đổi điều khoản (trên trang và qua thông báo); người dùng ngừng dùng và xoá tài khoản bất cứ lúc nào ở Cài đặt › Xoá tài khoản | – |
| 15 | `lien-he` | Luật áp dụng và liên hệ | Áp dụng pháp luật Việt Nam; email [email], địa chỉ [địa chỉ] | – |

Thẻ "Tóm tắt nhanh" có 4 ý: ai được dùng và cần đồng ý gì; nội dung không được đăng; Etsubi xử lý vi phạm và khiếu nại thế nào; dữ liệu cá nhân (link sang `/privacy/`).

## 6. Nội dung trang Chính sách quyền riêng tư (Phú)

Căn cứ chính:
- **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15**, hiệu lực 01/01/2026.
- **Nghị định 356/2025/NĐ-CP** hướng dẫn luật này. Nghị định 13/2023/NĐ-CP đã hết hiệu lực.

Những điểm bắt buộc rút ra:
- **Đồng ý chỉ có hiệu lực khi người dùng biết rõ** loại dữ liệu, mục đích, ai xử lý, quyền và nghĩa vụ của mình (Luật 91 Điều 9 khoản 2).
- **Đồng ý theo từng mục đích**, không ép đồng ý mục đích khác. Im lặng không được coi là đồng ý (Luật 91 Điều 9 khoản 4).
- **Không được đặt sẵn đồng ý.** Ô đồng ý không được tích sẵn (NĐ 356 Điều 6 khoản 3).
- **Phải lưu bằng chứng đồng ý**: ai, lúc nào, đồng ý nội dung gì (NĐ 356 Điều 6 khoản 1, 2).
- **Dữ liệu nhạy cảm:**
  - "Vị trí của cá nhân được xác định qua dịch vụ định vị" là dữ liệu nhạy cảm (NĐ 356 Điều 4 khoản 1 điểm h).
  - Khi xin đồng ý xử lý dữ liệu nhạy cảm phải nói rõ đó là dữ liệu nhạy cảm (NĐ 356 Điều 6 khoản 4).
  - Etsubi lưu toạ độ khi người dùng gắn địa điểm vào bài viết hoặc bình luận, nên thuộc nhóm này.
- **Nghĩa vụ riêng của mạng xã hội** (Luật 91 Điều 29):
  - nói rõ dữ liệu thu thập;
  - công khai chính sách bảo mật;
  - cho người dùng xem, sửa, xoá dữ liệu;
  - cho từ chối cookie;
  - có lựa chọn "không theo dõi";
  - không được đòi ảnh giấy tờ tùy thân để xác thực.
- **Chuyển dữ liệu ra nước ngoài** phải lập hồ sơ đánh giá tác động gửi cơ quan chuyên trách trong 60 ngày (Luật 91 Điều 20). Etsubi đang gửi nội dung tới DeepSeek (Trung Quốc) để dịch; xem mục 7.
- **Thời hạn phản hồi yêu cầu** (NĐ 356 Điều 5): phản hồi trong 02 ngày làm việc, rồi thực hiện trong:
  - 10 ngày với yêu cầu xem, sửa, cung cấp dữ liệu;
  - 15 ngày với yêu cầu rút lại đồng ý, hạn chế hoặc phản đối xử lý;
  - 20 ngày với yêu cầu xoá dữ liệu.
  - Được gia hạn 1 lần.
- **Sự cố lộ dữ liệu:** báo cơ quan chuyên trách chậm nhất 72 giờ (Luật 91 Điều 23). Với dữ liệu vị trí, NĐ 356 Điều 29 còn quy định thông báo cho người bị ảnh hưởng.
- **Trẻ em:** người đại diện theo pháp luật thực hiện quyền thay trẻ em. Công bố đời sống riêng tư của trẻ từ đủ 7 tuổi cần đồng ý của cả trẻ và người đại diện (Luật 91 Điều 24).

| # | id | Tiêu đề | Phải nói | Căn cứ |
|---|---|---|---|---|
| 1 | `ben-kiem-soat` | Ai chịu trách nhiệm về dữ liệu của bạn | Bên kiểm soát và xử lý dữ liệu: nhóm [tên nhóm] vận hành Etsubi; người liên hệ [họ tên], [email] | Luật 91 Điều 2 khoản 9; Điều 9 khoản 2 điểm b |
| 2 | `du-lieu-thu-thap` | Dữ liệu chúng tôi thu thập | **Bảng dữ liệu** bên dưới | Luật 91 Điều 29 khoản 1 |
| 3 | `muc-dich` | Mục đích xử lý | Mỗi mục đích ứng với một nhóm dữ liệu trong bảng. Nói rõ: không bán dữ liệu, không quảng cáo, không theo dõi ở trang web khác | Luật 91 Điều 9 khoản 4 |
| 4 | `vi-tri` | Dữ liệu vị trí là dữ liệu nhạy cảm | Toạ độ chỉ lưu khi người dùng tự gắn địa điểm; ai cũng xem được trên bài; gỡ được bất cứ lúc nào bằng cách sửa bài hoặc bình luận | NĐ 356 Điều 4 khoản 1 điểm h; Điều 6 khoản 4 |
| 5 | `cach-thu-thap` | Cách chúng tôi thu thập dữ liệu | Do người dùng tự cung cấp (đăng ký, hồ sơ, bài viết); hệ thống tự ghi (địa chỉ IP, thời gian đăng nhập) | – |
| 6 | `ben-thu-ba` | Bên thứ ba và dịch vụ bên ngoài | **Bảng bên thứ ba** bên dưới | Luật 91 Điều 17 |
| 7 | `ra-nuoc-ngoai` | Chuyển dữ liệu ra nước ngoài | Nêu quốc gia nhận (Trung Quốc, Vương quốc Anh và EU, Hoa Kỳ) và biện pháp bảo vệ | Luật 91 Điều 20 |
| 8 | `luu-tru` | Thời gian lưu trữ | Dữ liệu tài khoản lưu đến khi xoá tài khoản; nhật ký và địa chỉ IP: [thời hạn, chờ nhóm chốt, xem mục 7]; bản dịch lưu đệm xoá cùng bài; bản sao lưu cơ sở dữ liệu giữ [số] ngày | Luật 91 Điều 3 khoản 3; Điều 14 |
| 9 | `quyen-cua-ban` | Quyền của bạn | Liệt kê 6 nhóm quyền ở Luật 91 Điều 4 khoản 1, kèm thời hạn phản hồi ở NĐ 356 Điều 5 | Luật 91 Điều 4; NĐ 356 Điều 5 |
| 10 | `rut-lai-xoa` | Rút lại đồng ý và xoá tài khoản | Xoá ở Cài đặt › Xoá tài khoản (cần nhập mật khẩu). Xoá tài khoản là **xoá hẳn** cùng toàn bộ bài viết, bình luận, lượt thích, bài đã lưu, theo dõi, thông báo (backend xoá dây chuyền). Rút lại đồng ý không ảnh hưởng việc xử lý đã làm trước đó | Luật 91 Điều 10, Điều 14 |
| 11 | `tre-em` | Dữ liệu của trẻ em | Dành cho người từ đủ 16 tuổi; người dưới 16 tuổi cần cha, mẹ hoặc người giám hộ đăng ký và giám sát | Luật 91 Điều 24; NĐ 147 Điều 27 khoản 3 điểm a |
| 12 | `bao-mat` | Bảo mật và thông báo sự cố | Mật khẩu băm một chiều bằng argon2, kết nối HTTPS, phân quyền theo vai trò; báo cơ quan chuyên trách trong 72 giờ và báo cho người bị ảnh hưởng | Luật 91 Điều 23; NĐ 356 Điều 28, 29 |
| 13 | `cookie` | Cookie và bộ nhớ trình duyệt | Etsubi **không dùng cookie** quảng cáo hay theo dõi. Bộ nhớ trình duyệt chỉ lưu: phiên đăng nhập (localStorage, hoặc sessionStorage khi không chọn ghi nhớ), ngôn ngữ giao diện `etsubi_lang`, giao diện sáng/tối, bản nháp hồ sơ. Xoá được bằng cách đăng xuất hoặc xoá dữ liệu trang web | Luật 91 Điều 29 khoản 3, 4 |
| 14 | `thay-doi` | Thay đổi chính sách | Báo trên trang và qua thông báo; mục đích mới thì xin đồng ý lại | Luật 91 Điều 9 khoản 4 |
| 15 | `lien-he` | Liên hệ | Gửi yêu cầu tới [email], ghi rõ @handle | NĐ 356 Điều 5 khoản 1 |

**Bảng dữ liệu thu thập** (đã đối chiếu với `backend/migrations` và code FE ngày 2026-11-22; nếu backend đổi thì cập nhật):

| Nhóm dữ liệu | Gồm những gì | Dùng để | Bắt buộc? |
|---|---|---|---|
| Tài khoản | Email, mật khẩu (đã băm), tên hiển thị, tên người dùng (@handle) | Tạo tài khoản, đăng nhập, hiện tên trên bài viết | Bắt buộc |
| Hồ sơ | Ảnh đại diện, trường (`institute`), nơi ở (`address`), giới thiệu (`bio`), ngôn ngữ mẹ đẻ (`native`) | Hiện hồ sơ công khai, chọn ngôn ngữ dịch | Tuỳ chọn; ngôn ngữ mẹ đẻ bắt buộc |
| Nội dung | Bài viết, bình luận, ảnh chèn qua liên kết, chủ đề | Hiển thị trên diễn đàn, tìm kiếm | Khi bạn đăng |
| Vị trí (nhạy cảm) | Toạ độ (`latitude`, `longitude`) bạn gắn vào bài viết, bình luận | Hiện thẻ địa điểm và bản đồ | Tuỳ chọn |
| Hoạt động | Người theo dõi, lượt thích, bài đã lưu, thông báo | Tính năng cộng đồng | Khi bạn dùng |
| Quản trị | Vai trò, trạng thái cấm, thời hạn tắt tiếng | Kiểm duyệt, xử lý vi phạm | Tự động |
| Kỹ thuật | Địa chỉ IP, thời gian truy cập (nhật ký máy chủ) | Bảo mật, chống spam | Tự động |

**Bảng bên thứ ba:**

| Bên nhận | Dữ liệu gửi đi | Mục đích | Nơi xử lý |
|---|---|---|---|
| DeepSeek (`api.deepseek.com`) | Nội dung bài viết, bình luận khi có người bấm Dịch | Dịch tự động bằng AI | Trung Quốc |
| OpenStreetMap (Nominatim, máy chủ bản đồ) | Toạ độ, địa chỉ IP | Tìm tên địa điểm, tải bản đồ | Vương quốc Anh, EU |
| Google Fonts | Địa chỉ IP, thông tin trình duyệt | Tải phông chữ | Hoa Kỳ |
| Cloudflare | Địa chỉ IP, dữ liệu truy cập | Bảo vệ và chuyển tiếp truy cập tới máy chủ | Toàn cầu |
| Cơ quan nhà nước có thẩm quyền | Theo yêu cầu bằng văn bản | Theo quy định pháp luật | Việt Nam |

Máy chủ và cơ sở dữ liệu của Etsubi đặt tại Việt Nam. Nút "Xem trên Google Maps" chỉ mở link khi người dùng bấm, không tự gửi dữ liệu nên không cần đưa vào bảng; có thể ghi một câu ở mục 6.

**Hai ô đồng ý ở Đăng ký** (frame `Etsubi Register 1a`). Hiện chỉ có 1 ô "Tôi đồng ý với Điều khoản sử dụng"; tách thành 2 ô:
1. "Tôi đồng ý với **Điều khoản sử dụng** và xác nhận mình từ đủ 16 tuổi", link tới `/terms/`.
2. "Tôi đồng ý để Etsubi xử lý dữ liệu cá nhân theo **Chính sách quyền riêng tư** (bắt buộc để tạo tài khoản)", link tới `/privacy/`.

Quy tắc cho hai ô:
- Không tích sẵn. Ô nào thiếu thì báo lỗi riêng cho ô đó, nối bằng `aria-describedby` như ô hiện tại.
- Link mở tab mới (`target="_blank" rel="noopener"`) để người dùng không mất dữ liệu đang nhập.
- Bỏ thông báo tạm "Điều khoản sử dụng sẽ được cập nhật tại trung tâm trợ giúp." trong `utils/auth-page.js`.
- Trang Hoàn thiện hồ sơ (`register-advanced`): giữ ô hiện có, đổi link "Điều khoản sử dụng" sang `/terms/` và "Quy tắc cộng đồng Etsubi" sang mục quy tắc ở trang Hỗ trợ.
- Cập nhật chuỗi trong `i18n/auth.js` (VI, JA, EN). Chưa gửi gì lên backend (xem mục 7).

## 7. Việc ngoài phạm vi FE (đã báo người giao, không tự làm)

| Việc | Ai quyết | Căn cứ |
|---|---|---|
| Lưu bằng chứng đồng ý: thời điểm, phiên bản văn bản, đã tích ô nào. Cần backend thêm trường hoặc bảng `consents`; FE gửi kèm khi đăng ký | Phong (backend) | NĐ 356 Điều 6 khoản 2 |
| Ghi nhật ký đăng nhập, đăng xuất, địa chỉ IP tối thiểu 02 năm (mạng xã hội) | Phong + nhóm | NĐ 147 Điều 27 khoản 2 điểm b |
| Xác thực tài khoản bằng số điện thoại di động Việt Nam trước khi được đăng bài, bình luận | Nhóm quyết (đồ án môn học, chưa làm) | NĐ 147 Điều 27 khoản 3 điểm b |
| Thông báo hoặc xin giấy xác nhận cung cấp dịch vụ mạng xã hội (dưới 10.000 lượt truy cập hoặc dưới 1.000 người dùng thường xuyên mỗi tháng thì chỉ cần Giấy xác nhận thông báo, trên mức đó cần Giấy phép) nếu mở công khai lâu dài | Nhóm quyết | NĐ 147 Điều 24, 31 |
| Hồ sơ đánh giá tác động chuyển dữ liệu ra nước ngoài (do dùng DeepSeek), hoặc đổi sang dịch vụ dịch đặt tại Việt Nam | Nhóm quyết | Luật 91 Điều 20 |
| Nhắc "vị trí là dữ liệu nhạy cảm" ngay trong hộp Gắn địa điểm trước khi lưu | ShiroTrang thiết kế Figma trước, rồi mới làm FE | NĐ 356 Điều 6 khoản 4 |
| Thời hạn giữ bản sao lưu cơ sở dữ liệu trên máy chủ | ShiroTrang | Luật 91 Điều 3 khoản 3 |

## 8. Checklist trước khi báo xong

- [ ] Trang khớp Figma ở 1920, 1280 và 375, không cuộn ngang ở 375; mục lục dính khi cuộn ở desktop, đóng/mở được ở mobile.
- [ ] Mục lục đánh dấu đúng mục đang đọc, link `#id` nhảy đúng chỗ, không bị header che tiêu đề (`scroll-margin-top`).
- [ ] `node --experimental-vm-modules --no-warnings frontend/dev/tests/i18n.mjs` đạt (đủ JA, EN cho mọi chuỗi mới), và toàn bộ `frontend/dev/tests/*.mjs` đạt.
- [ ] Đổi ngôn ngữ giao diện sang 日本語 và English, kiểm tra không sót chữ tiếng Việt ở phần giao diện.
- [ ] Không có em dash (kiểm bằng Python, `git grep -P` không chạy trên Windows), không style inline, không animation; mỗi khối có chú thích tiếng Việt.
- [ ] Footer có đủ 2 link; trang Đăng ký có 2 ô đồng ý không tích sẵn, thiếu ô nào báo lỗi ô đó.
- [ ] Bản in (Ctrl+P) đọc được.
- [ ] Console sạch, không lỗi 404.
- [ ] Đã làm theo §7 "Final review procedure" của `AGENTS.md`.

## 9. Lưu ý về pháp lý

Tài liệu này tóm tắt văn bản luật để nhóm viết nội dung cho đúng ý; **đây không phải tư vấn pháp lý**. Trước khi mở trang cho người dùng thật, nên nhờ giảng viên hoặc người có chuyên môn pháp lý đọc lại. Bản JA và EN chưa có người bản ngữ đọc lại.

**Nguồn đã đọc** (đối chiếu nguyên văn ngày 2026-11-22):
- Luật Bảo vệ dữ liệu cá nhân 2025 số 91/2025/QH15: [Thư Viện Pháp Luật](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx)
- Nghị định 356/2025/NĐ-CP hướng dẫn Luật Bảo vệ dữ liệu cá nhân: [Thư Viện Pháp Luật](https://thuvienphapluat.vn/van-ban/Quyen-dan-su/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-687428.aspx), [Công báo số 18 ngày 18/01/2026](https://congbaocdn.chinhphu.vn/180507251028987904/2026/1/17/356signed-1768638052103952849513.pdf)
- Nghị định 147/2024/NĐ-CP về dịch vụ Internet và thông tin trên mạng: [Thư Viện Pháp Luật](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-147-2024-ND-CP-quan-ly-cung-cap-su-dung-dich-vu-Internet-thong-tin-tren-mang-480755.aspx)
- Luật An ninh mạng 2025 số 116/2025/QH15, hiệu lực 01/7/2026: [Thư Viện Pháp Luật](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-An-ninh-mang-2025-so-116-2025-QH15-666020.aspx). Danh sách hành vi bị cấm ở Điều 7 chưa được đối chiếu nguyên văn; người viết mục 4 của Điều khoản đọc trực tiếp điều này.
