#!/usr/bin/env bash
# Seed a local Etsubi back end with demo users and posts so the front end
# (search, post cards, header avatar) has something to show.
# Usage: bash frontend/dev/seed-demo.sh [API_BASE]
# Default API_BASE is the Docker API: http://localhost:21432/api/v1
# Demo accounts (local only, never use in production):
#   minhanh@demo.etsubi.vn / kenji@demo.etsubi.vn / lanhuong@demo.etsubi.vn
#   password for all: etsubi-demo-123
set -euo pipefail
API="${1:-http://localhost:21432/api/v1}"
PASS="etsubi-demo-123"
# The API rate-limits 4 req/s per IP; keep a gap between calls.
pause() { sleep 0.35; }

json() { python -c "import sys,json;print(json.load(sys.stdin)$1)"; }

register() { # username email native
  curl -s -o /dev/null -w "register $2: %{http_code}\n" -X POST "$API/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$1\",\"email\":\"$2\",\"password\":\"$PASS\",\"native\":\"$3\",\"language\":\"vi\"}"
  pause
}
login() { # email -> token
  curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"}" | json "['token']"
  pause
}
post() { # token title content tag1 [tag2]
  local token="$1" title="$2" content="$3"; shift 3
  local id
  id=$(curl -s -X POST "$API/posts" -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
    -d "$(python -c "import json,sys;print(json.dumps({'title':sys.argv[1],'content':sys.argv[2]}))" "$title" "$content")" | json "['id']")
  pause
  for tag in "$@"; do
    curl -s -o /dev/null -X POST "$API/posts/$id/tags/$tag" -H "Authorization: Bearer $token"; pause
  done
  echo "post $id: $title"
}

GENERAL=00000000-0000-0000-0000-000000000001
QUESTION=00000000-0000-0000-0000-000000000002
DISCUSSION=00000000-0000-0000-0000-000000000003
SHOWCASE=00000000-0000-0000-0000-000000000005

register "Minh Anh" minhanh@demo.etsubi.vn vi
register "Kenji Tanaka" kenji@demo.etsubi.vn ja
register "Lan Hương" lanhuong@demo.etsubi.vn vi

T1=$(login minhanh@demo.etsubi.vn)
T2=$(login kenji@demo.etsubi.vn)
T3=$(login lanhuong@demo.etsubi.vn)

post "$T3" "Kinh nghiệm chọn ryokan có onsen riêng cho gia đình" \
  "Tổng hợp câu hỏi hay gặp khi đặt ryokan có 貸切風呂 (bồn onsen riêng): giá, cách đặt giờ, có phù hợp trẻ nhỏ không… Mời mọi người bổ sung thêm." \
  $QUESTION $GENERAL
post "$T2" "Hỏi: onsen nào ở Kyoto cho phép hình xăm?" \
  "Bạn mình có hình xăm nhỏ ở tay, muốn tìm onsen hoặc sentō thân thiện với người có hình xăm (タトゥーOK) quanh khu Gion. Có ai từng đi chưa, chia sẻ giúp với!" \
  $QUESTION $GENERAL
post "$T1" "Tắm onsen có cần mang khăn riêng không?" \
  "Mình sắp đi Beppu lần đầu, đọc thấy mỗi onsen có quy định khác nhau về khăn tắm và khăn nhỏ. Mọi người thường tự mang hay thuê tại chỗ? Có cần mua vé trước không ạ?" \
  $QUESTION $GENERAL
post "$T2" "Lễ hội mùa hè ở Osaka: Tenjin Matsuri" \
  "Chia sẻ lịch trình đi Tenjin Matsuri năm nay, chỗ đứng xem pháo hoa và cách mặc yukata." \
  $DISCUSSION
post "$T1" "Dự án nhỏ: app học Kanji bằng flashcard" \
  "Mình làm một web app học Kanji N4 bằng HTML/CSS/JS thuần, mọi người dùng thử và góp ý nhé." \
  $SHOWCASE $GENERAL
post "$T3" "Trà đạo cho người mới bắt đầu" \
  "Những điều cơ bản về 茶道: cách cầm chén, cúi chào, và nơi học trà đạo ở TP. Hồ Chí Minh." \
  $DISCUSSION
echo "done"
