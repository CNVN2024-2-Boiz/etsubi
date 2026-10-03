BASE="http://localhost:11432/api/v1"
TOKEN_FILE="token.json"

USER_ID="${1:-}"

if [ -z "$USER_ID" ]; then
    echo "Cách dùng: $0 <user_id>"
    exit 1
fi

if [ ! -f "$TOKEN_FILE" ]; then
    echo "❌ Không có $TOKEN_FILE — chạy login.sh trước"
    exit 1
fi

TOKEN=$(jq -r .token "$TOKEN_FILE")

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Token không hợp lệ — chạy lại login.sh"
    exit 1
fi

echo "→ GET /users/$USER_ID"
echo "  token: ${TOKEN:0:30}..."
echo ""

curl -s "$BASE/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
